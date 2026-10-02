import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { OrderRecord } from "./orders.server";

const denied = { ok: false as const, error: "Sessão expirada. Entre novamente." };

async function isAdmin() {
  const { isAdmin: check } = await import("./admin-session.server");
  return check();
}

export type EventRow = {
  id: string;
  visitor_id: string;
  event: string;
  path: string | null;
  product_id: string | null;
  product_name: string | null;
  value: number | null;
  items: { name: string; quantity: number }[] | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  device: string | null;
  created_at: string;
};

/** Eventos do funil + pedidos do período (alimenta visão geral, live view e relatórios). */
export const getDashboard = createServerFn({ method: "POST" })
  .validator(z.object({ hours: z.number().min(1).max(2160) }))
  .handler(async ({ data }) => {
    if (!(await isAdmin())) return denied;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ordersDb } = await import("./orders.server");
    const since = new Date(Date.now() - data.hours * 3600_000).toISOString();
    const [events, orders] = await Promise.all([
      supabaseAdmin
        .from("funnel_events")
        .select(
          "id, visitor_id, event, path, product_id, product_name, value, items, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, device, created_at",
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000),
      ordersDb()
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);
    return {
      ok: true as const,
      now: new Date().toISOString(),
      events: (events.data ?? []) as EventRow[],
      orders: (orders.data ?? []) as OrderRecord[],
      ordersError: orders.error?.message ?? null,
    };
  });

/** Lista de pedidos com busca (todo o histórico). */
export const listOrders = createServerFn({ method: "POST" })
  .validator(
    z.object({
      status: z.enum(["all", "PAID", "PENDING", "CANCELLED", "REVERSED", "TO_SHIP", "SHIPPED"]),
      q: z.string().max(120),
      limit: z.number().int().min(1).max(1000),
    }),
  )
  .handler(async ({ data }) => {
    if (!(await isAdmin())) return denied;
    const { ordersDb } = await import("./orders.server");
    let query = ordersDb().select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.status === "TO_SHIP")
      query = query.eq("status", "PAID").neq("fulfillment_status", "shipped");
    else if (data.status === "SHIPPED") query = query.eq("fulfillment_status", "shipped");
    else if (data.status !== "all") query = query.eq("status", data.status);
    const q = data.q.trim().replace(/[%,()]/g, "");
    if (q) {
      const digits = q.replace(/\D/g, "");
      const ors = [
        `customer_name.ilike.%${q}%`,
        `customer_email.ilike.%${q}%`,
        `transaction_id.ilike.%${q}%`,
        ...(digits.length >= 3
          ? [`customer_document.ilike.%${digits}%`, `customer_phone.ilike.%${digits}%`]
          : []),
      ];
      query = query.or(ors.join(","));
    }
    const { data: rows, error } = await query;
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, orders: (rows ?? []) as OrderRecord[] };
  });

/** Envio: status de entrega, código de rastreio e observações. */
export const updateOrderFulfillment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      fulfillment_status: z.enum(["pending", "preparing", "shipped", "delivered", "cancelled"]),
      tracking_code: z.string().max(80),
      notes: z.string().max(2000),
    }),
  )
  .handler(async ({ data }) => {
    if (!(await isAdmin())) return denied;
    const { ordersDb } = await import("./orders.server");
    const patch: Record<string, unknown> = {
      fulfillment_status: data.fulfillment_status,
      tracking_code: data.tracking_code.trim() || null,
      notes: data.notes.trim() || null,
    };
    if (data.fulfillment_status === "shipped") patch["shipped_at"] = new Date().toISOString();
    const { error } = await ordersDb().update(patch).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

async function findOrder(id: string) {
  const { ordersDb } = await import("./orders.server");
  const { data } = await ordersDb().select("*").eq("id", id).maybeSingle();
  return (data as OrderRecord | null) ?? null;
}

/** Consulta a PixGate agora e atualiza o pedido (e dispara integrações se virou pago). */
export const refreshOrderPayment = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    if (!(await isAdmin())) return denied;
    const order = await findOrder(data.id);
    if (!order) return { ok: false as const, error: "Pedido não encontrado." };
    const { readPixGateKey, getTransactionStatus } = await import("./pixgate.server");
    const key = readPixGateKey();
    if (!key) return { ok: false as const, error: "PIXGATE_API_KEY não configurado." };
    try {
      const status = await getTransactionStatus(key, order.transaction_id);
      const { updateOrderStatus } = await import("./orders.server");
      if (status !== order.status) await updateOrderStatus(order.transaction_id, status);
      return { ok: true as const, status };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
    }
  });

/** Reenvia o pedido para Utmify e (se pago) para a Meta CAPI. */
export const resendOrderIntegrations = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    if (!(await isAdmin())) return denied;
    const order = await findOrder(data.id);
    if (!order) return { ok: false as const, error: "Pedido não encontrado." };
    const { dispatchIntegrations } = await import("./orders.server");
    await dispatchIntegrations(order);
    return { ok: true as const, integrations: order.integrations ?? {} };
  });

/** Situação das integrações e da tabela de pedidos. */
export const getIntegrationStatus = createServerFn({ method: "POST" }).handler(async () => {
  if (!(await isAdmin())) return denied;
  const { readPixGateKey, postbackUrl } = await import("./pixgate.server");
  const { readMetaToken } = await import("./meta-capi.server");
  const { readUtmifyToken } = await import("./utmify.server");
  const { ordersDb } = await import("./orders.server");
  const { META_PIXEL_ID, UTMIFY_PIXEL_ID } = await import("./tracking-config");

  let ordersTable: "ok" | "outdated" | "missing" = "ok";
  const probe = await ordersDb().select("id, tracking, fulfillment_status, integrations").limit(1);
  if (probe.error) {
    ordersTable =
      /relation|does not exist|schema cache/i.test(probe.error.message) &&
      !/column/i.test(probe.error.message)
        ? "missing"
        : "outdated";
  }

  let pixgate: { configured: boolean; balance?: number; error?: string } = {
    configured: !!readPixGateKey(),
  };
  const key = readPixGateKey();
  if (key) {
    try {
      const res = await fetch("https://app.pixgateip.com/api/getBalance", {
        headers: { Apikey: key, Accept: "application/json" },
      });
      const body = (await res.json().catch(() => ({}))) as { balance?: number; message?: string };
      pixgate = res.ok
        ? {
            configured: true,
            ...(typeof body.balance === "number" ? { balance: body.balance } : {}),
          }
        : { configured: true, error: body.message ?? `HTTP ${res.status}` };
    } catch (err) {
      pixgate = { configured: true, error: err instanceof Error ? err.message : String(err) };
    }
  }

  return {
    ok: true as const,
    pixgate,
    webhookUrl: postbackUrl(),
    meta: { pixelId: META_PIXEL_ID, capi: !!readMetaToken() },
    utmify: { pixelId: UTMIFY_PIXEL_ID, api: !!readUtmifyToken() },
    ordersTable,
  };
});

const sampleOrder = (): OrderRecord => ({
  id: "00000000-0000-0000-0000-000000000000",
  created_at: new Date().toISOString(),
  paid_at: new Date().toISOString(),
  status: "PAID",
  transaction_id: `teste-${Date.now()}`,
  amount: 1,
  shipping_id: "gratis",
  shipping_price: 0,
  items: [{ id: "teste", name: "Pedido de teste do painel", quantity: 1, unit_price: 1 }],
  customer_name: "Teste Painel Kazza",
  customer_email: "teste@example.com",
  customer_phone: "11999999999",
  customer_document: "11144477735",
  address: { city: "Sao Paulo", state: "SP", zipcode: "01310100" },
  tracking: { utm_source: "teste", utm_campaign: "teste-painel" },
});

/** Testa a Utmify com isTest=true (a Utmify valida mas não salva a venda). */
export const testUtmify = createServerFn({ method: "POST" }).handler(async () => {
  if (!(await isAdmin())) return denied;
  const { sendUtmifyOrder } = await import("./utmify.server");
  const r = await sendUtmifyOrder(sampleOrder(), { isTest: true });
  return r.ok ? { ok: true as const } : { ok: false as const, error: r.error ?? "erro" };
});

/** Envia um Purchase de teste para a aba "Eventos de teste" do Gerenciador de Eventos. */
export const testMetaCapi = createServerFn({ method: "POST" })
  .validator(z.object({ testEventCode: z.string().min(3).max(40) }))
  .handler(async ({ data }) => {
    if (!(await isAdmin())) return denied;
    const { sendMetaPurchase } = await import("./meta-capi.server");
    const r = await sendMetaPurchase(sampleOrder(), { testEventCode: data.testEventCode });
    return r.ok ? { ok: true as const } : { ok: false as const, error: r.error ?? "erro" };
  });

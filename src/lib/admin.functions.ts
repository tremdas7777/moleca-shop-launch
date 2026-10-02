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
  const { listPixels } = await import("./meta-pixels.server");
  const { getSetting, settingsTableExists } = await import("./settings.server");
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
    meta: await (async () => {
      const { table, pixels } = await listPixels();
      return {
        table,
        fallbackPixelId: META_PIXEL_ID,
        fallbackCapi: !!(process.env["META_CAPI_TOKEN"] ?? "").trim(),
        // O token nunca volta para o navegador: só se está configurado e o final dele.
        pixels: pixels.map((p) => ({
          id: p.id,
          name: p.name,
          pixel_id: p.pixel_id,
          active: p.active,
          hasToken: !!p.capi_token,
          tokenHint: p.capi_token ? `…${p.capi_token.slice(-4)}` : null,
        })),
      };
    })(),
    utmify: await (async () => {
      const panelToken = await getSetting("utmify_api_token");
      const envToken = (process.env["UTMIFY_API_TOKEN"] ?? "").trim();
      return {
        table: await settingsTableExists(),
        pixelId: (await getSetting("utmify_pixel_id")) || UTMIFY_PIXEL_ID,
        defaultPixelId: UTMIFY_PIXEL_ID,
        api: !!(panelToken || envToken),
        tokenSource: panelToken ? ("painel" as const) : envToken ? ("secret" as const) : null,
        tokenHint: panelToken ? `…${panelToken.slice(-4)}` : null,
      };
    })(),
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

/** Cria ou edita um Pixel. Token vazio na edição mantém o token atual. */
export const saveMetaPixel = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().max(80),
      pixel_id: z.string().regex(/^\d{8,20}$/, "ID do Pixel deve ter só números"),
      capi_token: z.string().max(600),
      active: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    if (!(await isAdmin())) return denied;
    const { pixelsDb, clearPixelCache } = await import("./meta-pixels.server");
    const row: Record<string, unknown> = {
      name: data.name.trim(),
      pixel_id: data.pixel_id,
      active: data.active,
    };
    if (data.capi_token.trim()) row["capi_token"] = data.capi_token.trim();
    const { error } = data.id
      ? await pixelsDb().update(row).eq("id", data.id)
      : await pixelsDb().insert(row);
    clearPixelCache();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const deleteMetaPixel = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    if (!(await isAdmin())) return denied;
    const { pixelsDb, clearPixelCache } = await import("./meta-pixels.server");
    const { error } = await pixelsDb().delete().eq("id", data.id);
    clearPixelCache();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/** Envia um Purchase de teste para a aba "Eventos de teste" do Gerenciador de Eventos. */
export const testMetaPixel = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), testEventCode: z.string().min(3).max(40) }))
  .handler(async ({ data }) => {
    if (!(await isAdmin())) return denied;
    const { activePixels, listPixels } = await import("./meta-pixels.server");
    const { sendMetaPurchase } = await import("./meta-capi.server");
    const pixel =
      (await listPixels()).pixels.find((p) => p.id === data.id) ??
      (await activePixels()).find((p) => p.id === data.id);
    if (!pixel) return { ok: false as const, error: "Pixel não encontrado." };
    if (!pixel.capi_token)
      return { ok: false as const, error: "Esse Pixel não tem token da API de Conversões." };
    const r = await sendMetaPurchase(sampleOrder(), { testEventCode: data.testEventCode, pixel });
    return r.ok ? { ok: true as const } : { ok: false as const, error: r.error ?? "erro" };
  });

/** Token da API e Pixel da Utmify. Campo vazio no token mantém o atual; `clearToken` apaga. */
export const saveUtmifySettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().max(400),
      clearToken: z.boolean(),
      pixelId: z.string().regex(/^[a-zA-Z0-9]{0,64}$/, "ID do Pixel inválido"),
    }),
  )
  .handler(async ({ data }) => {
    if (!(await isAdmin())) return denied;
    const { setSetting } = await import("./settings.server");
    const errors: string[] = [];
    if (data.clearToken || data.token.trim()) {
      const e = await setSetting("utmify_api_token", data.clearToken ? "" : data.token);
      if (e) errors.push(e);
    }
    const e = await setSetting("utmify_pixel_id", data.pixelId);
    if (e) errors.push(e);
    return errors.length
      ? { ok: false as const, error: errors.join(" | ") }
      : { ok: true as const };
  });

/** Preços editados no painel (os padrões vêm de `basePrices` no catálogo). */
export const getProductPricing = createServerFn({ method: "POST" }).handler(async () => {
  if (!(await isAdmin())) return denied;
  const { loadPriceOverrides } = await import("./prices.server");
  const { settingsTableExists } = await import("./settings.server");
  return {
    ok: true as const,
    overrides: await loadPriceOverrides(),
    table: await settingsTableExists(),
  };
});

const priceValue = z.number().min(0.01).max(1_000_000);

/** Grava todos os preços editados; produto fora da lista volta ao preço padrão. */
export const saveProductPrices = createServerFn({ method: "POST" })
  .validator(
    z.object({
      overrides: z.record(
        z.string().max(120),
        z.object({ price: priceValue, offers: z.record(z.string().max(4), priceValue).optional() }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    if (!(await isAdmin())) return denied;
    const { basePrices } = await import("./store");
    const { setSetting } = await import("./settings.server");
    const ids = new Set(basePrices.map((p) => p.id));
    const clean = Object.fromEntries(Object.entries(data.overrides).filter(([id]) => ids.has(id)));
    const error = await setSetting(
      "product_prices",
      Object.keys(clean).length ? JSON.stringify(clean) : "",
    );
    return error ? { ok: false as const, error } : { ok: true as const };
  });

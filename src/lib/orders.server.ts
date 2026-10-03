/**
 * Pedidos do checkout próprio (somente servidor). Tabela `orders` criada por supabase/orders.sql.
 * Gravações nunca derrubam o pagamento: erros só vão para o log.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type OrderItem = { id: string; name: string; quantity: number; unit_price: number };

export type OrderTrackingData = {
  visitorId?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  src?: string;
  sck?: string;
  referrer?: string;
  fbp?: string;
  fbc?: string;
  page_url?: string;
  ip?: string;
  user_agent?: string;
  device?: string;
};

export type IntegrationLog = Record<string, { ok: boolean; at: string; error?: string }>;

export type OrderRecord = {
  id: string;
  created_at: string;
  paid_at: string | null;
  status: string;
  transaction_id: string;
  amount: number;
  shipping_id: string;
  shipping_price: number;
  items: OrderItem[];
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_document: string;
  address: Record<string, string | undefined>;
  // Colunas da 2ª migration (podem não existir ainda).
  tracking?: OrderTrackingData | null;
  visitor_id?: string | null;
  fulfillment_status?: string | null;
  tracking_code?: string | null;
  shipped_at?: string | null;
  notes?: string | null;
  integrations?: IntegrationLog | null;
};

export type NewOrder = Omit<OrderRecord, "id" | "created_at" | "paid_at">;

// `orders` não está nos tipos gerados do Supabase.
export function ordersDb() {
  return (supabaseAdmin as unknown as SupabaseClient).from("orders");
}

const BASE_COLUMNS = [
  "transaction_id",
  "status",
  "amount",
  "shipping_id",
  "shipping_price",
  "items",
  "customer_name",
  "customer_email",
  "customer_phone",
  "customer_document",
  "address",
] as const;

export async function saveOrder(row: NewOrder): Promise<OrderRecord | null> {
  try {
    const full = await ordersDb().insert(row).select("*").single();
    if (!full.error) return full.data as OrderRecord;
    // Sem as colunas novas (migration 2 não aplicada): grava só o essencial.
    if (/column/i.test(full.error.message)) {
      const base = Object.fromEntries(BASE_COLUMNS.map((k) => [k, row[k]]));
      const retry = await ordersDb().insert(base).select("*").single();
      if (!retry.error) return { ...(retry.data as OrderRecord), tracking: row.tracking ?? null };
      console.error("[orders] erro ao salvar pedido", row.transaction_id, retry.error.message);
    } else {
      console.error("[orders] erro ao salvar pedido", row.transaction_id, full.error.message);
    }
  } catch (err) {
    console.error("[orders] erro ao salvar pedido", row.transaction_id, err);
  }
  return null;
}

export async function getOrderByTransaction(transactionId: string): Promise<OrderRecord | null> {
  try {
    const { data } = await ordersDb().select("*").eq("transaction_id", transactionId).maybeSingle();
    return (data as OrderRecord | null) ?? null;
  } catch {
    return null;
  }
}

/** Registra o resultado de uma integração no pedido (coluna `integrations`). */
export async function logIntegration(
  order: OrderRecord,
  name: string,
  result: { ok: boolean; error?: string },
) {
  const integrations: IntegrationLog = {
    ...(order.integrations ?? {}),
    [name]: {
      ok: result.ok,
      at: new Date().toISOString(),
      ...(result.error ? { error: result.error } : {}),
    },
  };
  order.integrations = integrations;
  if (!result.ok) console.error(`[integração ${name}]`, order.transaction_id, result.error);
  try {
    await ordersDb().update({ integrations }).eq("id", order.id);
  } catch {
    // ignora: opcional
  }
}

/** Envia o pedido para Utmify e Meta CAPI somente quando pago (venda aprovada). */
export async function dispatchIntegrations(order: OrderRecord) {
  const { sendUtmifyOrder, readUtmifyToken } = await import("./utmify.server");
  const { sendMetaPurchase, hasCapiPixels } = await import("./meta-capi.server");
  const tasks: Promise<void>[] = [];
  if (order.status === "PAID" && (await readUtmifyToken())) {
    tasks.push(
      sendUtmifyOrder(order).then((r) =>
        logIntegration(order, `utmify_${order.status.toLowerCase()}`, r),
      ),
    );
  }
  if (order.status === "PAID" && (await hasCapiPixels())) {
    tasks.push(sendMetaPurchase(order).then((r) => logIntegration(order, "meta_purchase", r)));
  }
  await Promise.all(tasks);
}

/**
 * Atualiza o status do pedido. Só dispara integrações quando o status realmente muda,
 * então webhook + consulta do checkout ao mesmo tempo não duplicam a venda.
 */
export async function updateOrderStatus(transactionId: string, status: string) {
  try {
    const patch = status === "PAID" ? { status, paid_at: new Date().toISOString() } : { status };
    const { data, error } = await ordersDb()
      .update(patch)
      .eq("transaction_id", transactionId)
      .neq("status", status)
      .select("*");
    if (error) {
      console.error("[orders] erro ao atualizar pedido", transactionId, error.message);
      return;
    }
    const changed = (data as OrderRecord[] | null)?.[0];
    if (changed) await dispatchIntegrations(changed);
  } catch (err) {
    console.error("[orders] erro ao atualizar pedido", transactionId, err);
  }
}

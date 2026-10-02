/** Meta Conversions API (somente servidor). Token no secret META_CAPI_TOKEN. */
import { createHash } from "node:crypto";
import { META_PIXEL_ID } from "./tracking-config";
import type { OrderRecord } from "./orders.server";

const GRAPH_VERSION = "v23.0";

export function readMetaToken(): string | null {
  return (process.env["META_CAPI_TOKEN"] ?? "").trim() || null;
}

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const norm = (v: string | null | undefined) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

/** Envia o evento Purchase do pedido pago. O event_id é o id da transação (deduplica com o Pixel). */
export async function sendMetaPurchase(order: OrderRecord, opts: { testEventCode?: string } = {}) {
  const token = readMetaToken();
  if (!token) return { ok: false, error: "META_CAPI_TOKEN não configurado" };

  const [first, ...rest] = norm(order.customer_name).split(/\s+/);
  const phone = order.customer_phone.replace(/\D/g, "");
  const t = order.tracking ?? {};
  const addr = order.address ?? {};
  const userData: Record<string, unknown> = {
    em: [sha(norm(order.customer_email))],
    ph: [sha(phone.startsWith("55") ? phone : `55${phone}`)],
    fn: first ? [sha(first)] : undefined,
    ln: rest.length ? [sha(rest.join(" "))] : undefined,
    ct: addr["city"] ? [sha(norm(addr["city"]).replace(/\s+/g, ""))] : undefined,
    st: addr["state"] ? [sha(norm(addr["state"]))] : undefined,
    zp: addr["zipcode"] ? [sha(String(addr["zipcode"]).replace(/\D/g, ""))] : undefined,
    country: [sha("br")],
    external_id: [sha(t.visitorId ?? order.customer_document)],
    client_ip_address: t.ip,
    client_user_agent: t.user_agent,
    fbp: t.fbp,
    fbc: t.fbc,
  };

  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(new Date(order.paid_at ?? Date.now()).getTime() / 1000),
        event_id: order.transaction_id,
        action_source: "website",
        event_source_url: t.page_url,
        user_data: Object.fromEntries(Object.entries(userData).filter(([, v]) => v != null)),
        custom_data: {
          currency: "BRL",
          value: Number(order.amount),
          order_id: order.transaction_id,
          content_type: "product",
          content_ids: order.items.map((i) => i.id),
          contents: order.items.map((i) => ({
            id: i.id,
            quantity: i.quantity,
            item_price: i.unit_price,
          })),
          num_items: order.items.reduce((s, i) => s + i.quantity, 0),
        },
      },
    ],
    ...(opts.testEventCode ? { test_event_code: opts.testEventCode } : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    if (!res.ok) return { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

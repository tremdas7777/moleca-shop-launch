/** Meta Conversions API (somente servidor). Tokens por Pixel, cadastrados no painel. */
import { createHash } from "node:crypto";
import { activePixels, type MetaPixel } from "./meta-pixels.server";
import type { OrderRecord } from "./orders.server";

const GRAPH_VERSION = "v23.0";

/** Há pelo menos um Pixel ativo com token da API de Conversões? */
export async function hasCapiPixels() {
  return (await activePixels()).some((p) => p.capi_token);
}

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const norm = (v: string | null | undefined) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

/**
 * Envia o Purchase do pedido pago para cada Pixel ativo com token (ou só para `opts.pixel`).
 * O event_id é o id da transação, o mesmo usado pelo Pixel no navegador (deduplicação).
 */
export async function sendMetaPurchase(
  order: OrderRecord,
  opts: { testEventCode?: string; pixel?: MetaPixel } = {},
) {
  const targets = (opts.pixel ? [opts.pixel] : await activePixels()).filter((p) => p.capi_token);
  if (!targets.length) return { ok: false, error: "Nenhum Pixel com token da API de Conversões" };

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

  const results = await Promise.all(
    targets.map(async (pixel) => {
      try {
        const res = await fetch(
          `https://graph.facebook.com/${GRAPH_VERSION}/${pixel.pixel_id}/events?access_token=${encodeURIComponent(pixel.capi_token!)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        return res.ok ? null : `${pixel.pixel_id}: ${json.error?.message ?? `HTTP ${res.status}`}`;
      } catch (err) {
        return `${pixel.pixel_id}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }),
  );
  const errors = results.filter((r): r is string => !!r);
  return errors.length ? { ok: false, error: errors.join(" | ") } : { ok: true };
}

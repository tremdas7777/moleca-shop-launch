/** Envio de vendas para a Utmify (somente servidor). Token no secret UTMIFY_API_TOKEN. */
import type { OrderRecord } from "./orders.server";

const UTMIFY_URL = "https://api.utmify.com.br/api-credentials/orders";

export function readUtmifyToken(): string | null {
  return (process.env["UTMIFY_API_TOKEN"] ?? "").trim() || null;
}

/** "YYYY-MM-DD HH:MM:SS" em UTC, formato exigido pela Utmify. */
const utc = (iso: string | null | undefined) =>
  iso ? new Date(iso).toISOString().replace("T", " ").slice(0, 19) : null;

const STATUS: Record<string, "waiting_payment" | "paid" | "refused" | "refunded"> = {
  PENDING: "waiting_payment",
  PAID: "paid",
  CANCELLED: "refused",
  REVERSED: "refunded",
};

export async function sendUtmifyOrder(order: OrderRecord, opts: { isTest?: boolean } = {}) {
  const token = readUtmifyToken();
  if (!token) return { ok: false, error: "UTMIFY_API_TOKEN não configurado" };

  const t = order.tracking ?? {};
  const totalCents = Math.round(Number(order.amount) * 100);
  const body = {
    orderId: order.transaction_id,
    platform: "KazzaCheckout",
    paymentMethod: "pix",
    status: STATUS[order.status] ?? "waiting_payment",
    createdAt: utc(order.created_at),
    approvedDate: order.status === "PAID" ? utc(order.paid_at ?? new Date().toISOString()) : null,
    refundedAt: order.status === "REVERSED" ? utc(new Date().toISOString()) : null,
    customer: {
      name: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone,
      document: order.customer_document,
      country: "BR",
      ...(t.ip ? { ip: t.ip } : {}),
    },
    products: order.items.map((i) => ({
      id: i.id,
      name: i.name,
      planId: null,
      planName: null,
      quantity: i.quantity,
      priceInCents: Math.round(i.unit_price * 100),
    })),
    trackingParameters: {
      src: t.src ?? null,
      sck: t.sck ?? null,
      utm_source: t.utm_source ?? null,
      utm_campaign: t.utm_campaign ?? null,
      utm_medium: t.utm_medium ?? null,
      utm_content: t.utm_content ?? null,
      utm_term: t.utm_term ?? null,
    },
    // A PixGate não informa a taxa na criação; o valor líquido real fica no painel dela.
    commission: {
      totalPriceInCents: totalCents,
      gatewayFeeInCents: 0,
      userCommissionInCents: totalCents,
    },
    isTest: !!opts.isTest,
  };

  try {
    const res = await fetch(UTMIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-token": token },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status} ${text.slice(0, 160)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

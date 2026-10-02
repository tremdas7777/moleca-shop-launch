import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { findShipping } from "./shipping";
import { findProduct } from "./store";
import type { OrderTrackingData } from "./orders.server";

const orderInput = z.object({
  items: z
    .array(z.object({ id: z.string().min(1), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(40),
  shippingId: z.string().min(1),
  device: z.enum(["android", "ios", "web"]).optional(),
  tracking: z
    .object({
      visitorId: z.string().max(64),
      utm_source: z.string().max(200).optional(),
      utm_medium: z.string().max(200).optional(),
      utm_campaign: z.string().max(300).optional(),
      utm_content: z.string().max(300).optional(),
      utm_term: z.string().max(300).optional(),
      src: z.string().max(300).optional(),
      sck: z.string().max(300).optional(),
      referrer: z.string().max(500).optional(),
      fbp: z.string().max(200).optional(),
      fbc: z.string().max(500).optional(),
      page_url: z.string().max(1000).optional(),
    })
    .optional(),
  customer: z.object({
    name: z.string().min(3).max(120),
    email: z.string().email().max(160),
    phone: z.string().regex(/^\d{10,11}$/),
    document: z.string().regex(/^\d{11}$/),
  }),
  address: z.object({
    zipcode: z.string().regex(/^\d{8}$/),
    street: z.string().min(2).max(160),
    number: z.string().min(1).max(20),
    neighborhood: z.string().min(1).max(100),
    complement: z.string().max(100).optional(),
    city: z.string().min(1).max(100),
    state: z.string().length(2),
  }),
});

export type OrderInput = z.infer<typeof orderInput>;

export type PixChargeResult =
  | { ok: true; transactionId: string; amount: number; pixCode: string }
  | { ok: false; reason: "not_configured" | "invalid_items" | "gateway_error"; error: string };

/**
 * Cria a cobrança PIX do pedido na PixGate. O total é recalculado aqui no servidor a partir do
 * catálogo e da tabela de frete, nunca a partir do que o navegador envia.
 */
export const createPixCharge = createServerFn({ method: "POST" })
  .validator(orderInput)
  .handler(async ({ data }): Promise<PixChargeResult> => {
    const shipping = findShipping(data.shippingId);
    if (!shipping) {
      return { ok: false, reason: "invalid_items", error: "Selecione uma forma de frete." };
    }
    let amount = shipping.price;
    const lines: { id: string; name: string; quantity: number; unit_price: number }[] = [];
    for (const item of data.items) {
      const product = findProduct(item.id);
      if (!product) {
        return { ok: false, reason: "invalid_items", error: "Produto indisponível no momento." };
      }
      const unitPrice = product.salePrice ?? product.price;
      amount += unitPrice * item.quantity;
      lines.push({
        id: product.id,
        name: product.name,
        quantity: item.quantity,
        unit_price: unitPrice,
      });
    }
    amount = Math.round(amount * 100) / 100;

    const { readPixGateKey, createCashIn, postbackUrl } = await import("./pixgate.server");
    const apiKey = readPixGateKey();
    if (!apiKey) {
      return {
        ok: false,
        reason: "not_configured",
        error: "Pagamento PIX indisponível no momento.",
      };
    }

    const postback = postbackUrl();
    try {
      const charge = await createCashIn(apiKey, {
        nome: data.customer.name,
        cpf: data.customer.document,
        valor: amount,
        descricao: lines
          .map((l) => `${l.quantity}x ${l.name}`)
          .join(", ")
          .slice(0, 200),
        ...(postback ? { postback } : {}),
        ...(data.device ? { device: data.device } : {}),
      });
      const { saveOrder, dispatchIntegrations } = await import("./orders.server");
      const { requestMeta } = await import("./pixgate.server");
      const tracking = Object.fromEntries(
        Object.entries({ ...data.tracking, ...requestMeta(), device: data.device }).filter(
          ([, v]) => v != null && v !== "",
        ),
      ) as OrderTrackingData;
      const order = await saveOrder({
        transaction_id: charge.id,
        status: "PENDING",
        amount,
        shipping_id: shipping.id,
        shipping_price: shipping.price,
        items: lines,
        customer_name: data.customer.name,
        customer_email: data.customer.email,
        customer_phone: data.customer.phone,
        customer_document: data.customer.document,
        address: data.address,
        tracking,
        visitor_id: data.tracking?.visitorId ?? null,
      });
      // Utmify recebe a venda como "aguardando pagamento".
      if (order) await dispatchIntegrations(order);
      return { ok: true, transactionId: charge.id, amount, pixCode: charge.pix };
    } catch (err) {
      console.error("[pix] erro ao criar cobrança", err);
      // Mostra o motivo devolvido pela PixGate para facilitar o diagnóstico.
      const detail = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        reason: "gateway_error",
        error: `Não foi possível gerar o PIX (${detail.slice(0, 160)}).`,
      };
    }
  });

export type PixStatusResult = {
  status: "PENDING" | "PAID" | "CANCELLED" | "REVERSED" | "DISPUTED" | "UNKNOWN";
};

/** Consulta o status da cobrança (o checkout chama a cada poucos segundos até ser paga). */
export const checkPixStatus = createServerFn({ method: "POST" })
  .validator(z.object({ transactionId: z.string().min(1).max(128) }))
  .handler(async ({ data }): Promise<PixStatusResult> => {
    const { readPixGateKey, getTransactionStatus } = await import("./pixgate.server");
    const apiKey = readPixGateKey();
    if (!apiKey) return { status: "UNKNOWN" };
    try {
      const status = await getTransactionStatus(apiKey, data.transactionId);
      if (status !== "PENDING") {
        const { updateOrderStatus } = await import("./orders.server");
        await updateOrderStatus(data.transactionId, status);
      }
      return { status };
    } catch (err) {
      console.error("[pix] erro ao consultar status", err);
      return { status: "UNKNOWN" };
    }
  });

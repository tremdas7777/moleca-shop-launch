import { useState } from "react";
import { toast } from "sonner";
import type { CartItem } from "./cart";
import { formatBRL } from "./format";
import { kitProducts, store } from "./store";
import { createZedyStoreCheckout } from "./zedy-server";

function whatsappOrderUrl(items: CartItem[]) {
  const total = items.reduce(
    (sum, i) => sum + (i.product.salePrice ?? i.product.price) * i.quantity,
    0,
  );
  const message = [
    `Olá! Quero finalizar meu pedido na ${store.name}:`,
    ...items.flatMap((i) => [
      `• ${i.quantity}x ${i.product.name}`,
      ...kitProducts(i.product).map((p) => `   - ${p.name}`),
    ]),
    `Total: ${formatBRL(total)}`,
  ].join("\n");
  return `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function useCheckout() {
  const [busy, setBusy] = useState(false);

  const checkout = async (items: CartItem[]) => {
    if (busy || !items.length) return;
    setBusy(true);
    try {
      const result = await createZedyStoreCheckout({
        data: { items: items.map((i) => ({ id: i.product.id, quantity: i.quantity })) },
      });
      if (result.ok) {
        window.location.href = result.checkoutUrl;
        return;
      }
      if (result.reason === "not_configured") {
        window.location.href = whatsappOrderUrl(items);
        return;
      }
      if (result.missing?.length) {
        toast.error(`Indisponível no momento: ${result.missing.slice(0, 3).join(", ")}`);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Não foi possível abrir o checkout. Tente novamente.");
    }
    setBusy(false);
  };

  return { busy, checkout };
}

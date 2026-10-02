import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { CartItem } from "./cart";
import { findProduct } from "./store";
import { track } from "./track";

const CHECKOUT_KEY = "kazza-checkout";
/** Último pedido pago, lido pela página /obrigado para o evento Purchase. */
export const PURCHASE_KEY = "kazza-purchase";

export type CheckoutLine = { id: string; quantity: number };

/** Itens que o cliente escolheu levar ao checkout (carrinho ou "Comprar agora"). */
export function readCheckoutItems(): CartItem[] {
  try {
    const lines: CheckoutLine[] = JSON.parse(sessionStorage.getItem(CHECKOUT_KEY) ?? "[]");
    return lines
      .map((l) => ({ product: findProduct(l.id)!, quantity: l.quantity }))
      .filter((i) => i.product && i.quantity > 0);
  } catch {
    return [];
  }
}

export function useCheckout() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const checkout = async (items: CartItem[]) => {
    if (busy || !items.length) return;
    setBusy(true);
    const lines: CheckoutLine[] = items.map((i) => ({ id: i.product.id, quantity: i.quantity }));
    sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(lines));
    track({
      event: "checkout",
      value: items.reduce((s, i) => s + (i.product.salePrice ?? i.product.price) * i.quantity, 0),
      items: items.map((i) => ({ name: i.product.name, quantity: i.quantity })),
    });
    await navigate({ to: "/checkout" });
    setBusy(false);
  };

  return { busy, checkout };
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { useCart } from "@/lib/cart";
import { PURCHASE_KEY } from "@/lib/checkout";
import { track } from "@/lib/track";
import { store } from "@/lib/store";

type PaidOrder = {
  transactionId: string;
  value: number;
  items: { id: string; name: string; quantity: number; price: number }[];
};

export const Route = createFileRoute("/obrigado")({
  head: () => ({
    meta: [
      { title: `Pedido confirmado | ${store.name}` },
      { name: "description", content: "Seu pedido foi confirmado. Obrigado pela compra!" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ObrigadoPage,
});

function ObrigadoPage() {
  const { clear } = useCart();

  useEffect(() => {
    // Conversão de venda: dispara apenas nesta página, para onde o cliente
    // retorna após o pagamento confirmado no checkout.
    let purchase: PaidOrder | null = null;
    try {
      purchase = JSON.parse(sessionStorage.getItem(PURCHASE_KEY) ?? "null");
    } catch {
      // ignora: opcional
    }
    if (purchase) {
      // eventID = id da transação: o Meta deduplica com o Purchase enviado pela CAPI.
      window.fbq?.(
        "track",
        "Purchase",
        {
          currency: "BRL",
          value: purchase.value,
          content_type: "product",
          content_ids: purchase.items.map((i) => i.id),
          contents: purchase.items.map((i) => ({
            id: i.id,
            quantity: i.quantity,
            item_price: i.price,
          })),
          num_items: purchase.items.reduce((s, i) => s + i.quantity, 0),
        },
        { eventID: purchase.transactionId },
      );
      track({
        event: "purchase",
        value: purchase.value,
        items: purchase.items.map((i) => ({ name: i.name, quantity: i.quantity })),
      });
      sessionStorage.removeItem(PURCHASE_KEY);
    }
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-pix" />
        <h1 className="mt-6 font-display text-3xl font-bold uppercase text-neutral-900">
          Pedido confirmado!
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Obrigado pela sua compra na {store.name}. Você receberá os detalhes do pedido e do envio
          por e-mail.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center bg-primary px-6 py-3 text-[13px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-neutral-900"
        >
          Voltar para a loja
        </Link>
      </div>
    </div>
  );
}

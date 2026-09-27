import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import { formatBRL, installmentValue, pixPrice } from "@/lib/format";
import { kitProducts, store } from "@/lib/store";
import { ProductImage } from "./ProductImage";

export function CartSheet() {
  const { items, total, open, setOpen, setQuantity, remove } = useCart();

  const checkoutMessage = encodeURIComponent(
    [
      `Olá! Quero finalizar meu pedido na ${store.name}:`,
      ...items.flatMap((i) => [
        `• ${i.quantity}x ${i.product.name}`,
        ...kitProducts(i.product).map((p) => `   - ${p.name}`),
      ]),
      `Total: ${formatBRL(total)}`,
    ].join("\n"),
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-left font-display text-xl uppercase">Meu carrinho</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Seu carrinho está vazio.
          </p>
        ) : (
          <ul className="flex-1 divide-y overflow-y-auto px-4">
            {items.map(({ product, quantity }) => (
              <li key={product.id} className="flex gap-3 py-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded border bg-white">
                  <ProductImage product={product} />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <p className="text-sm font-medium leading-tight">{product.name}</p>
                  <p className="text-sm font-bold">
                    {formatBRL((product.salePrice ?? product.price) * quantity)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Diminuir quantidade"
                      onClick={() => setQuantity(product.id, quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Aumentar quantidade"
                      onClick={() => setQuantity(product.id, quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto h-7 w-7"
                      aria-label="Remover"
                      onClick={() => remove(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <SheetFooter className="border-t">
            <div className="w-full space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-bold">{formatBRL(total)}</span>
              </div>
              <div className="text-right text-xs">
                <p className="font-semibold text-pix">{formatBRL(pixPrice(total))} no Pix</p>
                <p className="text-muted-foreground">
                  ou {store.installments}x de {formatBRL(installmentValue(total))} no cartão
                </p>
              </div>
              <a
                href={`https://wa.me/${store.whatsapp}?text=${checkoutMessage}`}
                target="_blank"
                rel="noreferrer"
                className="block w-full bg-primary py-3.5 text-center text-[13px] font-bold uppercase tracking-wider text-white hover:bg-primary/90"
              >
                Finalizar compra
              </a>
              <button
                onClick={() => setOpen(false)}
                className="block w-full py-2 text-center text-[13px] font-semibold text-neutral-600 underline"
              >
                Continuar comprando
              </button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

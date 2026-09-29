import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import { useCheckout } from "@/lib/checkout";
import { formatBRL } from "@/lib/format";
import { warmZedyCatalog } from "@/lib/zedy-server";
import { ProductImage } from "./ProductImage";

export function CartSheet() {
  const { items, total, open, setOpen, setQuantity, remove } = useCart();
  const { busy, checkout } = useCheckout();

  useEffect(() => {
    if (open && items.length) void warmZedyCatalog().catch(() => {});
  }, [open, items.length]);

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
                  <p className="text-sm font-bold text-pix">
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
                <span className="text-xl font-bold text-pix">{formatBRL(total)}</span>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void checkout(items)}
                className="block w-full bg-primary py-3.5 text-center text-[13px] font-bold uppercase tracking-wider text-white hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? "Abrindo checkout…" : "Finalizar compra"}
              </button>
              <p className="text-center text-[11px] text-muted-foreground">
                Frete e pagamento são finalizados no checkout seguro.
              </p>
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

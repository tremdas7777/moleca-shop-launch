import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useCheckout } from "@/lib/checkout";
import { formatBRL } from "@/lib/format";
import { kitProducts, type Product } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ProductImage } from "./ProductImage";

export function FeaturedKitCard({ kit, className }: { kit: Product; className?: string }) {
  const { add } = useCart();
  const { busy, checkout } = useCheckout();
  const items = kitProducts(kit);
  const finalPrice = kit.salePrice ?? kit.price;
  const discount = kit.salePrice ? Math.round((1 - kit.salePrice / kit.price) * 100) : 0;
  const productLink = { to: "/produto/$id", params: { id: kit.id } } as const;

  return (
    <article
      className={cn(
        "group relative flex flex-col border-2 border-primary bg-white p-4 shadow-lg",
        className,
      )}
    >
      <div className="absolute left-0 top-0 z-10 flex">
        <span className="bg-primary px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
          ★ O mais vendido
        </span>
        {discount > 0 && (
          <span className="bg-neutral-900 px-2.5 py-1 text-xs font-bold text-white">
            {discount}% OFF
          </span>
        )}
      </div>

      <Link {...productLink} className="relative block min-h-0 flex-1 overflow-hidden pt-6">
        <ProductImage product={kit} className="max-h-[420px]" />
      </Link>

      <div className="mt-3">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Kit com {items.length} produtos
        </p>
        <Link
          {...productLink}
          className="mt-1 line-clamp-3 font-display text-lg font-bold uppercase leading-tight text-neutral-900 hover:underline md:text-xl"
        >
          {kit.name}
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-0.5">
            {kit.salePrice && (
              <p className="text-xs text-neutral-400 line-through">{formatBRL(kit.price)}</p>
            )}
            <p className="text-3xl font-bold text-pix">{formatBRL(finalPrice)}</p>
          </div>
          {kit.salePrice && (
            <p className="bg-pix/10 px-3 py-1.5 text-sm font-bold text-pix">
              Economize {formatBRL(kit.price - kit.salePrice)}
            </p>
          )}
        </div>

        <button
          disabled={busy}
          onClick={() => void checkout([{ product: kit, quantity: 1 }])}
          className="mt-4 w-full bg-primary py-3.5 text-[13px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-neutral-900 disabled:opacity-60"
        >
          {busy ? "Abrindo checkout…" : "Comprar agora"}
        </button>
        <button
          onClick={() => add(kit.id)}
          className="mt-2 flex w-full items-center justify-center gap-2 border-2 border-neutral-900 py-3 text-[13px] font-bold uppercase tracking-wider text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-white"
        >
          <ShoppingCart className="h-4 w-4" />
          Adicionar ao carrinho
        </button>
      </div>
    </article>
  );
}

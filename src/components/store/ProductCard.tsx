import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/format";
import type { Product } from "@/lib/store";
import { ProductImage } from "./ProductImage";

const buttonClass =
  "mt-3 block w-full bg-neutral-900 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const finalPrice = product.salePrice ?? product.price;
  const discount = product.salePrice
    ? Math.round((1 - product.salePrice / product.price) * 100)
    : 0;
  const productLink = { to: "/produto/$id", params: { id: product.id } } as const;

  return (
    <article className="group relative flex h-full flex-col bg-white p-3 outline outline-1 outline-transparent transition-[outline-color] hover:outline-neutral-200">
      <Link {...productLink} className="relative block aspect-square overflow-hidden">
        <ProductImage product={product} />
        {discount > 0 && (
          <span className="absolute left-0 top-0 bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white">
            {discount}% OFF
          </span>
        )}
      </Link>

      <div className="mt-3 flex flex-1 flex-col">
        <Link
          {...productLink}
          className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-5 text-neutral-800 hover:underline"
        >
          {product.name}
        </Link>

        <div className="mt-2 space-y-0.5">
          <p className="h-4 text-xs text-neutral-400 line-through">
            {product.salePrice ? formatBRL(product.price) : ""}
          </p>
          <p className="text-[13px] text-neutral-600">
            {product.hasVariants && "A partir de "}
            <span className="text-lg font-bold text-pix">{formatBRL(finalPrice)}</span>
          </p>
        </div>

        {product.hasVariants ? (
          <Link {...productLink} className={buttonClass}>
            Escolher opção
          </Link>
        ) : (
          <button
            onClick={() => add(product.id)}
            aria-label="Adicionar ao carrinho"
            className={`${buttonClass} flex items-center justify-center gap-1.5`}
          >
            <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
            Adicionar<span className="hidden sm:inline"> ao carrinho</span>
          </button>
        )}
      </div>
    </article>
  );
}

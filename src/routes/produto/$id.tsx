import { useEffect, useState } from "react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ChevronRight, Minus, Plus, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { ProductImage } from "@/components/store/ProductImage";
import { ProductShelf } from "@/components/store/ProductShelf";
import { useCart } from "@/lib/cart";
import { useCheckout } from "@/lib/checkout";
import { formatBRL } from "@/lib/format";
import { categories, kitProducts, products, productsByCategory, store } from "@/lib/store";
import { warmZedyCatalog } from "@/lib/zedy-server";

export const Route = createFileRoute("/produto/$id")({
  loader: ({ params }) => {
    const product = products.find((p) => p.id === params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.name} | ${store.name} ${store.tagline}` },
          { property: "og:title", content: loaderData.product.name },
          { property: "og:image", content: loaderData.product.image },
        ]
      : [],
  }),
  component: ProductPage,
});

const perks = [
  { icon: Truck, text: "Frete grátis para todo o Brasil" },
  { icon: ShieldCheck, text: "Compra 100% segura" },
];

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { add } = useCart();
  const { busy, checkout } = useCheckout();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    void warmZedyCatalog().catch(() => {});
  }, []);

  const category = categories.find((c) => c.id === product.category);
  const items = kitProducts(product);
  const finalPrice = product.salePrice ?? product.price;
  const discount = product.salePrice
    ? Math.round((1 - product.salePrice / product.price) * 100)
    : 0;
  const related = (items.length > 0 ? items : productsByCategory(product.category)).filter(
    (p) => p.id !== product.id,
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <nav
        aria-label="Navegação"
        className="flex flex-wrap items-center gap-1 text-xs text-neutral-500"
      >
        <Link to="/" className="hover:text-neutral-900">
          Início
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/" hash={category?.id ?? "ofertas"} className="hover:text-neutral-900">
          {category?.name ?? "Kits"}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="line-clamp-1 text-neutral-800">{product.name}</span>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="relative aspect-square border border-neutral-200 bg-white p-6">
          <ProductImage product={product} />
          {discount > 0 && (
            <span className="absolute left-4 top-4 bg-primary px-2 py-1 text-xs font-bold text-white">
              {discount}% OFF
            </span>
          )}
        </div>

        <div>
          <h1 className="font-display text-3xl font-bold uppercase leading-tight text-neutral-900 md:text-4xl">
            {product.name}
          </h1>
          <p className="mt-1 text-xs text-neutral-400">Cód. {product.id}</p>

          <div className="mt-6 space-y-1 border-y border-neutral-200 py-5">
            {product.salePrice && (
              <p className="text-sm text-neutral-400 line-through">{formatBRL(product.price)}</p>
            )}
            <p className="text-sm text-neutral-600">
              {product.hasVariants && "A partir de "}
              <span className="text-4xl font-bold text-pix">{formatBRL(finalPrice)}</span>
            </p>
          </div>

          <div className="mt-6 flex gap-3">
            <div className="flex h-12 items-center border border-neutral-300">
              <button
                aria-label="Diminuir quantidade"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-full w-11 items-center justify-center text-neutral-700 hover:bg-neutral-100"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
              <button
                aria-label="Aumentar quantidade"
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-full w-11 items-center justify-center text-neutral-700 hover:bg-neutral-100"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              disabled={busy}
              onClick={() => void checkout([{ product, quantity }])}
              className="h-12 flex-1 bg-primary text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-neutral-900 disabled:opacity-60"
            >
              {busy ? "Abrindo checkout…" : "Comprar agora"}
            </button>
          </div>
          <button
            onClick={() => add(product.id, quantity)}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 border-2 border-neutral-900 text-sm font-bold uppercase tracking-wider text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-white"
          >
            <ShoppingCart className="h-4 w-4" />
            Adicionar ao carrinho
          </button>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {perks.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[13px] text-neutral-700">
                <Icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
                {text}
              </li>
            ))}
          </ul>

          {items.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-bold uppercase">
                Produtos do kit ({items.length})
              </h2>
              <ul className="mt-3 divide-y divide-neutral-100 border-y border-neutral-100">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      to="/produto/$id"
                      params={{ id: item.id }}
                      className="flex items-center gap-3 py-2 hover:bg-neutral-50"
                    >
                      <div className="h-12 w-12 shrink-0">
                        <ProductImage product={item} />
                      </div>
                      <span className="flex-1 text-[13px] text-neutral-800">1x {item.name}</span>
                      <span className="text-[13px] text-neutral-500">
                        {formatBRL(item.salePrice ?? item.price)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <section className="mt-12">
        <h2 className="border-b border-neutral-200 pb-2 font-display text-2xl font-bold uppercase">
          Descrição
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-neutral-700">
          {product.description ?? category?.about}
        </p>
      </section>

      {related.length > 0 && (
        <div className="mt-12">
          <ProductShelf
            id={items.length > 0 ? undefined : category?.id}
            title={items.length > 0 ? "Compre separado" : "Você também pode gostar"}
            products={related}
          />
        </div>
      )}
    </div>
  );
}

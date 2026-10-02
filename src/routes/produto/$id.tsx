import { useEffect, useState } from "react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Check, ChevronRight, Minus, Plus, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { ProductImage } from "@/components/store/ProductImage";
import { ProductShelf } from "@/components/store/ProductShelf";
import { useCart } from "@/lib/cart";
import { useCheckout } from "@/lib/checkout";
import { formatBRL } from "@/lib/format";
import {
  bundleId,
  categories,
  findProduct,
  kitProducts,
  products,
  productsByCategory,
  store,
} from "@/lib/store";
import { track } from "@/lib/track";

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
  const [units, setUnits] = useState(1);
  const offers = product.offers ?? [];
  const selected = (units > 1 && findProduct(bundleId(product.id, units))) || product;
  const photos = [product.image, ...(product.gallery ?? [])].filter((src): src is string =>
    Boolean(src),
  );
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    setPhoto(0);
    setUnits(1);
    track({ event: "product_view", productId: product.id, productName: product.name, value: product.salePrice ?? product.price });
  }, [product.id]);

  const category = categories.find((c) => c.id === product.category);
  const items = kitProducts(product);
  const finalPrice = selected.salePrice ?? selected.price;
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
        <div>
          <div className="relative aspect-square border border-neutral-200 bg-white p-6">
            <ProductImage
              product={photos[photo] ? { ...product, image: photos[photo] } : product}
            />
            {discount > 0 && (
              <span className="absolute left-4 top-4 bg-primary px-2 py-1 text-xs font-bold text-white">
                {discount}% OFF
              </span>
            )}
          </div>
          {photos.length > 1 && (
            <ul className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-8">
              {photos.map((src, i) => (
                <li key={src}>
                  <button
                    aria-label={`Ver foto ${i + 1}`}
                    onClick={() => setPhoto(i)}
                    className={`aspect-square w-full border bg-white p-1 ${
                      i === photo ? "border-primary" : "border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    <img src={src} alt="" loading="lazy" className="h-full w-full object-contain" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h1 className="font-display text-3xl font-bold uppercase leading-tight text-neutral-900 md:text-4xl">
            {product.name}
          </h1>
          <p className="mt-1 text-xs text-neutral-400">Cód. {product.id}</p>

          <div className="mt-6 space-y-1 border-y border-neutral-200 py-5">
            {selected.salePrice && (
              <p className="text-sm text-neutral-400 line-through">{formatBRL(selected.price)}</p>
            )}
            <p className="text-sm text-neutral-600">
              {product.hasVariants && "A partir de "}
              <span className="text-4xl font-bold text-pix">{formatBRL(finalPrice)}</span>
            </p>
          </div>

          {offers.length > 0 && (
            <fieldset className="mt-6">
              <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-900">
                Escolha a quantidade
              </legend>
              <div className="space-y-2">
                {offers.map((offer) => {
                  const single = offers[0]!.price;
                  const saving = single * offer.units - offer.price;
                  const best = offer.units === offers[offers.length - 1]!.units && offer.units > 1;
                  const active = offer.units === units;
                  return (
                    <label
                      key={offer.units}
                      className={`relative flex cursor-pointer items-center gap-3 border-2 px-4 py-3 transition-colors ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="oferta"
                        checked={active}
                        onChange={() => setUnits(offer.units)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="flex-1">
                        <span className="block text-sm font-bold text-neutral-900">
                          {offer.units} {offer.units === 1 ? "unidade" : "unidades"}
                        </span>
                        {offer.units > 1 && (
                          <span className="block text-xs text-neutral-600">
                            {formatBRL(offer.price / offer.units)} cada
                            {saving > 0 && (
                              <span className="font-semibold text-pix">
                                {" "}
                                · Economize {formatBRL(saving)}
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                      <span className="text-base font-bold text-pix">{formatBRL(offer.price)}</span>
                      {best && (
                        <span className="absolute -top-2.5 right-3 bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          Melhor preço
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="mt-6 flex gap-3">
            <div
              className={`h-12 items-center border border-neutral-300 ${offers.length > 0 ? "hidden" : "flex"}`}
            >
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
              onClick={() => void checkout([{ product: selected, quantity }])}
              className="h-12 flex-1 bg-primary text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-neutral-900 disabled:opacity-60"
            >
              {busy ? "Abrindo checkout…" : "Comprar agora"}
            </button>
          </div>
          <button
            onClick={() => add(selected.id, quantity)}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 border-2 border-neutral-900 text-sm font-bold uppercase tracking-wider text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-white"
          >
            <ShoppingCart className="h-4 w-4" />
            Adicionar ao carrinho
          </button>

          {product.highlights && (
            <ul className="mt-6 space-y-2">
              {product.highlights.map((text) => (
                <li key={text} className="flex items-start gap-2 text-sm text-neutral-800">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-pix" strokeWidth={2.5} />
                  {text}
                </li>
              ))}
            </ul>
          )}

          {product.compatibleBrands && (
            <div className="mt-6 border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Compatível com todos os elétricos e híbridos plug-in das marcas
              </p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {product.compatibleBrands.map((brand) => (
                  <li
                    key={brand}
                    className="border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800"
                  >
                    {brand}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-neutral-500">
                E qualquer outro carro com entrada Tipo 2, padrão no Brasil.
              </p>
            </div>
          )}

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
        {product.details && (
          <div className="mt-8 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {product.details.map(({ title, text }) => (
              <div key={title} className="border-l-2 border-primary pl-4">
                <h3 className="font-display text-lg font-bold uppercase text-neutral-900">
                  {title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-700">{text}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {product.specs && (
        <section className="mt-12">
          <h2 className="border-b border-neutral-200 pb-2 font-display text-2xl font-bold uppercase">
            Ficha técnica
          </h2>
          <table className="mt-4 w-full max-w-3xl text-sm">
            <tbody>
              {product.specs.map(([label, value]) => (
                <tr key={label} className="border-b border-neutral-100 even:bg-neutral-50">
                  <th className="w-2/5 py-2 pl-3 pr-4 text-left font-semibold text-neutral-900">
                    {label}
                  </th>
                  <td className="py-2 pr-3 text-neutral-700">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

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

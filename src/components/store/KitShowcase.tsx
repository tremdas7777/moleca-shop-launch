import { Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { formatBRL, installmentValue, pixPrice } from "@/lib/format";
import { kitProducts, kits, store, type Product } from "@/lib/store";
import { ProductImage } from "./ProductImage";

function KitCard({ kit }: { kit: Product }) {
  const { add } = useCart();
  const items = kitProducts(kit);
  const separate = items.reduce((sum, p) => sum + (p.salePrice ?? p.price), 0);
  const finalPrice = kit.salePrice ?? kit.price;
  const savings = separate - finalPrice;
  const discount = Math.round((savings / separate) * 100);

  return (
    <article className="grid border border-neutral-200 bg-white md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Link
        to="/produto/$id"
        params={{ id: kit.id }}
        className="group relative block aspect-square border-b border-neutral-200 p-4 md:border-b-0 md:border-r"
      >
        <ProductImage product={kit} />
        {discount > 0 && (
          <span className="absolute left-4 top-4 bg-primary px-2 py-1 text-xs font-bold text-white">
            {discount}% OFF NO KIT
          </span>
        )}
      </Link>

      <div className="flex flex-col p-5 md:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Kit com {items.length} produtos
        </p>
        <h3 className="mt-1 font-display text-2xl font-bold uppercase leading-tight text-neutral-900 md:text-3xl">
          <Link to="/produto/$id" params={{ id: kit.id }} className="hover:underline">
            {kit.name}
          </Link>
        </h3>
        {kit.description && <p className="mt-2 text-sm text-neutral-600">{kit.description}</p>}

        <ul className="mt-5 divide-y divide-neutral-100 border-y border-neutral-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2">
              <div className="h-12 w-12 shrink-0 overflow-hidden">
                <ProductImage product={item} />
              </div>
              <span className="flex-1 text-[13px] leading-5 text-neutral-800">1x {item.name}</span>
              <span className="text-[13px] text-neutral-500">
                {formatBRL(item.salePrice ?? item.price)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-xs text-neutral-500">
              Separados: <span className="line-through">{formatBRL(separate)}</span>
            </p>
            <p className="text-3xl font-bold text-neutral-900">{formatBRL(finalPrice)}</p>
            <p className="text-xs text-neutral-500">
              {store.installments}x de {formatBRL(installmentValue(finalPrice))}
            </p>
            <p className="text-sm font-semibold text-pix">
              {formatBRL(pixPrice(finalPrice))} no Pix
            </p>
          </div>
          {savings > 0 && (
            <p className="bg-pix/10 px-3 py-1.5 text-sm font-bold text-pix">
              Economize {formatBRL(savings)}
            </p>
          )}
        </div>

        <button
          onClick={() => add(kit.id)}
          className="mt-5 w-full bg-primary py-3.5 text-[13px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-neutral-900"
        >
          Comprar kit
        </button>
      </div>
    </article>
  );
}

export function KitShowcase() {
  if (kits.length === 0) return null;

  return (
    <section id="kits" className="scroll-mt-44">
      <div className="mb-4 border-b border-neutral-200 pb-2">
        <h2 className="font-display text-2xl font-bold uppercase text-neutral-900 md:text-[28px]">
          Kits
        </h2>
      </div>
      <div className="space-y-4">
        {kits.map((kit) => (
          <KitCard key={kit.id} kit={kit} />
        ))}
      </div>
    </section>
  );
}

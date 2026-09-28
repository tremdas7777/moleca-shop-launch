import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Benefits } from "@/components/store/Benefits";
import { CategoryGrid } from "@/components/store/CategoryGrid";
import { HeroBanner } from "@/components/store/HeroBanner";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductShelf } from "@/components/store/ProductShelf";
import { categories, kits, products, productsByCategory } from "@/lib/store";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { busca?: string } => {
    const busca = search["busca"];
    return typeof busca === "string" && busca ? { busca } : {};
  },
  component: Index,
});

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function Index() {
  const { busca = "" } = Route.useSearch();
  const query = normalize(busca.trim());

  const results = useMemo(
    () => (query ? products.filter((p) => normalize(p.name).includes(query)) : []),
    [query],
  );

  if (query) {
    return (
      <section className="container mx-auto px-4 py-8">
        <p className="text-[13px] text-neutral-500">Resultados da busca</p>
        <h1 className="mb-6 font-display text-2xl font-bold uppercase">
          “{busca.trim()}” · {results.length} produto{results.length === 1 ? "" : "s"}
        </h1>
        {results.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-600">
            Não encontramos nenhum produto com esse termo. Tente buscar por outra palavra.
          </p>
        )}
      </section>
    );
  }

  return (
    <>
      <HeroBanner />
      <Benefits />
      <div className="container mx-auto space-y-12 px-4 py-10">
        <ProductShelf
          id="ofertas"
          title="Mais vendidos"
          layout="grid"
          products={products.filter((p) => p.bestSeller)}
          featured={kits[0]}
        />
        <CategoryGrid />
        {categories.map((c) => (
          <ProductShelf key={c.id} id={c.id} title={c.name} products={productsByCategory(c.id)} />
        ))}
      </div>
    </>
  );
}

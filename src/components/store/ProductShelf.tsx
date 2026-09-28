import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { Product } from "@/lib/store";
import { FeaturedKitCard } from "./FeaturedKitCard";
import { ProductCard } from "./ProductCard";

export function ProductShelf({
  id,
  title,
  products,
  layout = "carousel",
  featured,
}: {
  id?: string | undefined;
  title: string;
  products: Product[];
  layout?: "carousel" | "grid";
  featured?: Product | undefined;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    if (!api) return;
    const update = () => {
      setCanPrev(api.canScrollPrev());
      setCanNext(api.canScrollNext());
    };
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  return (
    <section id={id} className="scroll-mt-44">
      <div className="mb-4 flex items-end justify-between border-b border-neutral-200 pb-2">
        <h2 className="font-display text-2xl font-bold uppercase text-neutral-900 md:text-[28px]">
          {title}
        </h2>
        <div className="flex items-center gap-4">
          {id && (
            <Link
              to="/"
              hash={id}
              className="text-[13px] font-semibold text-neutral-600 hover:text-primary"
            >
              Ver todos
            </Link>
          )}
          {layout === "carousel" && (
            <div className="flex gap-1">
              <button
                aria-label="Anterior"
                disabled={!canPrev}
                onClick={() => api?.scrollPrev()}
                className="flex h-8 w-8 items-center justify-center border border-neutral-300 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                aria-label="Próximo"
                disabled={!canNext}
                onClick={() => api?.scrollNext()}
                className="flex h-8 w-8 items-center justify-center border border-neutral-300 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {layout === "grid" ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {featured && <FeaturedKitCard kit={featured} className="col-span-2 sm:row-span-2" />}
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <Carousel setApi={setApi} opts={{ align: "start" }}>
          <CarouselContent className="-ml-2">
            {products.map((product) => (
              <CarouselItem
                key={product.id}
                className="basis-[45%] pl-2 sm:basis-[31%] lg:basis-1/4 xl:basis-1/5"
              >
                <ProductCard product={product} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      )}
    </section>
  );
}

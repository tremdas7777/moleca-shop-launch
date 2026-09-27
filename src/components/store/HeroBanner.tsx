import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { banners, type Banner } from "@/lib/store";

const AUTOPLAY_MS = 6000;

const themes: Record<
  Banner["theme"],
  { wrapper: string; eyebrow: string; button: string; coupon: string }
> = {
  dark: {
    wrapper: "bg-neutral-900 text-white",
    eyebrow: "bg-primary text-white",
    button: "bg-white text-neutral-900 hover:bg-neutral-200",
    coupon: "border-white/40",
  },
  brand: {
    wrapper: "bg-primary text-white",
    eyebrow: "bg-neutral-900 text-white",
    button: "bg-neutral-900 text-white hover:bg-neutral-800",
    coupon: "border-white/50",
  },
  light: {
    wrapper: "bg-neutral-100 text-neutral-900",
    eyebrow: "bg-neutral-900 text-white",
    button: "bg-primary text-white hover:bg-primary/90",
    coupon: "border-neutral-400",
  },
};

function Slide({ banner }: { banner: Banner }) {
  const theme = themes[banner.theme];

  return (
    <div className={cn("relative h-[300px] overflow-hidden md:h-[440px]", theme.wrapper)}>
      {banner.image && (
        <img
          src={banner.image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-right"
        />
      )}
      {banner.image && (
        <div
          className={cn(
            "absolute inset-0 md:hidden",
            banner.theme === "light" ? "bg-white/70" : "bg-black/55",
          )}
        />
      )}
      <div className="container relative mx-auto flex h-full items-center px-6 md:px-16">
        <div className="max-w-md">
          <span
            className={cn(
              "inline-block px-2 py-1 text-[11px] font-bold uppercase tracking-widest",
              theme.eyebrow,
            )}
          >
            {banner.eyebrow}
          </span>
          <h2 className="mt-3 font-display text-5xl font-extrabold uppercase italic leading-[0.9] md:text-7xl">
            {banner.title}
          </h2>
          <p className="mt-3 text-sm opacity-80 md:text-base">{banner.subtitle}</p>
          {banner.coupon && (
            <p
              className={cn(
                "mt-4 inline-block border-2 border-dashed px-4 py-1.5 text-sm",
                theme.coupon,
              )}
            >
              Cupom <strong className="font-display text-lg tracking-wide">{banner.coupon}</strong>
            </p>
          )}
          <div>
            <Link
              to="/"
              hash={banner.category}
              className={cn(
                "mt-6 inline-block px-7 py-3 text-[13px] font-bold uppercase tracking-wider transition-colors",
                theme.button,
              )}
            >
              {banner.cta}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroBanner() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    const timer = setInterval(() => api.scrollNext(), AUTOPLAY_MS);
    return () => {
      clearInterval(timer);
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <section className="group relative">
      <Carousel setApi={setApi} opts={{ loop: true }}>
        <CarouselContent className="ml-0">
          {banners.map((banner) => (
            <CarouselItem key={banner.id} className="pl-0">
              <Slide banner={banner} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <button
        aria-label="Banner anterior"
        onClick={() => api?.scrollPrev()}
        className="absolute left-0 top-1/2 hidden h-14 w-9 -translate-y-1/2 items-center justify-center bg-black/30 text-white opacity-0 transition-opacity group-hover:opacity-100 md:flex"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        aria-label="Próximo banner"
        onClick={() => api?.scrollNext()}
        className="absolute right-0 top-1/2 hidden h-14 w-9 -translate-y-1/2 items-center justify-center bg-black/30 text-white opacity-0 transition-opacity group-hover:opacity-100 md:flex"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {banners.map((banner, i) => (
          <button
            key={banner.id}
            aria-label={`Ir para o banner ${i + 1}`}
            onClick={() => api?.scrollTo(i)}
            className={cn(
              "h-1 w-6 transition-colors",
              i === current ? "bg-current opacity-100" : "bg-current opacity-30",
              banners[current]?.theme === "light" ? "text-neutral-900" : "text-white",
            )}
          />
        ))}
      </div>
    </section>
  );
}

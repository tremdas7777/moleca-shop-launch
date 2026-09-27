import { cn } from "@/lib/utils";
import { store, type Product } from "@/lib/store";

export function ProductImage({ product, className }: { product: Product; className?: string }) {
  if (product.image) {
    return (
      <img
        src={product.image}
        alt={product.name}
        loading="lazy"
        className={cn(
          "h-full w-full object-contain transition-transform duration-500 group-hover:scale-105",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-neutral-100 font-display text-xl font-extrabold uppercase italic text-neutral-300",
        className,
      )}
    >
      {store.name}
    </div>
  );
}

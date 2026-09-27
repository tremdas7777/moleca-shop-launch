import { Link } from "@tanstack/react-router";
import { categories, productsByCategory } from "@/lib/store";

export function CategoryGrid() {
  return (
    <section id="departamentos" className="scroll-mt-44">
      <h2 className="mb-4 border-b border-neutral-200 pb-2 font-display text-2xl font-bold uppercase md:text-[28px]">
        Compre por departamento
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((c) => (
          <li key={c.id} className="last:col-span-2 sm:last:col-span-1">
            <Link
              to="/"
              hash={c.id}
              className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden bg-neutral-900 p-4 text-white [li:last-child_&]:aspect-[8/3] sm:[li:last-child_&]:aspect-[4/3]"
            >
              {c.image && (
                <img
                  src={c.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 to-transparent" />
              <span className="relative font-display text-2xl font-bold uppercase leading-none">
                {c.name}
              </span>
              <span className="relative mt-1 text-xs text-neutral-300">
                {productsByCategory(c.id).length} produtos
              </span>
              <span className="absolute left-0 top-0 h-1 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

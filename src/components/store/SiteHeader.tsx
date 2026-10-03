import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import { Headset, Menu, Search, ShoppingBag, User } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/format";
import { announcements, categories, store } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Logo({ inverted }: { inverted?: boolean }) {
  return (
    <Link to="/" className="flex shrink-0 flex-col leading-none" aria-label={store.name}>
      <span
        className={cn(
          "font-display text-[28px] font-extrabold uppercase italic tracking-tight",
          inverted ? "text-white" : "text-neutral-900",
        )}
      >
        {store.name}
        <span className="text-primary">.</span>
      </span>
      <span
        className={cn(
          "text-[9px] font-semibold uppercase tracking-[0.35em]",
          inverted ? "text-neutral-400" : "text-neutral-500",
        )}
      >
        {store.tagline}
      </span>
    </Link>
  );
}

const navLinks = [
  ...categories.map((c) => ({ hash: c.id, name: c.name })),
  { hash: "ofertas", name: "Kits" },
];

function AnnouncementBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % announcements.length), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-neutral-900 text-[12px] text-neutral-200">
      <div className="container mx-auto flex h-8 items-center justify-center px-4 md:justify-between">
        <p className="md:hidden">{announcements[index]}</p>
        {announcements.map((text, i) => (
          <p key={text} className="hidden md:block">
            {i === 0 && <span className="mr-1 font-semibold text-white">•</span>}
            {text}
          </p>
        ))}
      </div>
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <form
      role="search"
      onSubmit={(e) => e.preventDefault()}
      className={cn(
        "flex h-11 w-full border border-neutral-300 bg-white focus-within:border-neutral-900",
        className,
      )}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Busque por produto, linha ou categoria"
        className="min-w-0 flex-1 bg-transparent px-4 text-base md:text-sm outline-none placeholder:text-neutral-400"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="flex w-12 items-center justify-center text-neutral-700"
      >
        <Search className="h-5 w-5" />
      </button>
    </form>
  );
}

export function SiteHeader() {
  const { count, total, setOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useLocation({ select: (l) => l.pathname });
  const { busca: search = "" } = useSearch({ strict: false });

  const onSearchChange = (value: string) =>
    navigate({ to: "/", search: value ? { busca: value } : {}, replace: pathname === "/" });

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
      <AnnouncementBar />

      <div className="container mx-auto flex items-center gap-4 px-4 py-4 lg:gap-10">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="-ml-1 p-1 lg:hidden" aria-label="Abrir menu">
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="gap-0 p-0">
            <SheetHeader className="border-b">
              <SheetTitle className="text-left font-display text-lg uppercase">
                Departamentos
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.hash}
                  to="/"
                  hash={link.hash}
                  onClick={() => setMenuOpen(false)}
                  className="border-b px-4 py-3.5 text-sm font-medium"
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Logo />

        <SearchBox value={search} onChange={onSearchChange} className="hidden lg:flex" />

        <div className="ml-auto flex items-center gap-6">
          <a href="#" className="hidden items-center gap-2 text-[13px] leading-tight lg:flex">
            <User className="h-6 w-6 text-neutral-700" strokeWidth={1.5} />
            <span>
              Olá! <strong className="font-semibold">Entre</strong>
              <br />
              ou <strong className="font-semibold">cadastre-se</strong>
            </span>
          </a>
          <a
            href={`https://wa.me/${store.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 text-[13px] leading-tight xl:flex"
          >
            <Headset className="h-6 w-6 text-neutral-700" strokeWidth={1.5} />
            <span>
              Atendimento
              <br />
              <strong className="font-semibold">{store.phone}</strong>
            </span>
          </a>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 text-[13px] leading-tight"
            aria-label="Abrir carrinho"
          >
            <span className="relative">
              <ShoppingBag className="h-6 w-6 text-neutral-700" strokeWidth={1.5} />
              <span className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            </span>
            <span className="hidden text-left lg:block">
              Carrinho
              <br />
              <strong className="font-semibold">{formatBRL(total)}</strong>
            </span>
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-3 lg:hidden">
        <SearchBox value={search} onChange={onSearchChange} />
      </div>

      <nav className="hidden bg-neutral-900 lg:block">
        <ul className="container mx-auto flex items-center px-4 text-[13px] font-semibold uppercase tracking-wide text-white">
          <li>
            <Link
              to="/"
              hash="departamentos"
              className="flex items-center gap-2 bg-primary px-5 py-3"
            >
              <Menu className="h-4 w-4" />
              Departamentos
            </Link>
          </li>
          {navLinks.map((link) => (
            <li key={link.hash}>
              <Link
                to="/"
                hash={link.hash}
                className="block px-5 py-3 transition-colors hover:bg-white/10"
              >
                {link.name}
              </Link>
            </li>
          ))}
          <li className="ml-auto">
            <Link
              to="/"
              hash="ofertas"
              className="block px-5 py-3 text-yellow-400 hover:bg-white/10"
            >
              Ofertas
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}

import { Link } from "@tanstack/react-router";
import { Instagram, Lock, Youtube } from "lucide-react";
import { categories, store } from "@/lib/store";
import { Logo } from "./SiteHeader";

const institutional = [
  "Quem somos",
  "Política de privacidade",
  "Trocas e devoluções",
  "Prazos de entrega",
  "Seja um revendedor",
];

const account = ["Minha conta", "Meus pedidos", "Rastrear pedido", "Lista de desejos"];

const payments = ["Visa", "Master", "Elo", "Amex", "Hiper", "Pix", "Boleto"];

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-white">{title}</h3>
      <ul className="space-y-2 text-[13px]">{children}</ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-neutral-950 text-neutral-400">
      <div className="container mx-auto grid gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-1">
          <Logo inverted />
          <p className="text-[13px]">{store.description}</p>
          <div className="flex gap-2">
            <a
              href={store.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="flex h-9 w-9 items-center justify-center border border-neutral-700 hover:border-white hover:text-white"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href={store.youtube}
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
              className="flex h-9 w-9 items-center justify-center border border-neutral-700 hover:border-white hover:text-white"
            >
              <Youtube className="h-4 w-4" />
            </a>
          </div>
        </div>

        <FooterColumn title="Departamentos">
          {categories.map((c) => (
            <li key={c.id}>
              <Link to="/" hash={c.id} className="hover:text-white">
                {c.name}
              </Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Institucional">
          {institutional.map((label) => (
            <li key={label}>
              <a href="#" className="hover:text-white">
                {label}
              </a>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Minha conta">
          {account.map((label) => (
            <li key={label}>
              <a href="#" className="hover:text-white">
                {label}
              </a>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Atendimento">
          <li>
            <a
              href={`https://wa.me/${store.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              WhatsApp: {store.phone}
            </a>
          </li>
          <li>
            <a href={`mailto:${store.email}`} className="break-all hover:text-white">
              {store.email}
            </a>
          </li>
          <li>{store.hours}</li>
        </FooterColumn>
      </div>

      <div className="border-t border-neutral-800">
        <div className="container mx-auto flex flex-col gap-6 px-4 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white">
              Formas de pagamento
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {payments.map((p) => (
                <li
                  key={p}
                  className="flex h-7 min-w-12 items-center justify-center bg-white px-2 text-[11px] font-bold text-neutral-800"
                >
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <Lock className="h-4 w-4 text-pix" />
            Site protegido com certificado SSL
          </div>
        </div>
      </div>

      <div className="bg-black py-4">
        <p className="container mx-auto px-4 text-center text-[11px] leading-relaxed text-neutral-500">
          {store.company} · CNPJ {store.cnpj} · {store.address}
          <br />
          Preços e condições válidos exclusivamente para compras na loja online.
        </p>
      </div>
    </footer>
  );
}

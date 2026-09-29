import { QrCode, RotateCcw, ShieldCheck, Truck } from "lucide-react";

const benefits = [
  {
    icon: Truck,
    title: "Frete grátis",
    text: "Para todo o Brasil",
  },
  {
    icon: QrCode,
    title: "Pague com Pix",
    text: "Aprovação na hora",
  },
  {
    icon: RotateCcw,
    title: "Troca garantida",
    text: "7 dias para trocar ou devolver",
  },
  { icon: ShieldCheck, title: "Compra 100% segura", text: "Certificado SSL e dados protegidos" },
];

export function Benefits() {
  return (
    <section className="border-b border-neutral-200 bg-white">
      <ul className="container mx-auto grid grid-cols-2 divide-neutral-200 px-4 lg:grid-cols-4 lg:divide-x">
        {benefits.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-center gap-3 py-4 lg:justify-center">
            <Icon className="h-7 w-7 shrink-0 text-neutral-800" strokeWidth={1.25} />
            <div className="leading-tight">
              <p className="text-[13px] font-bold uppercase">{title}</p>
              <p className="text-xs text-neutral-500">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

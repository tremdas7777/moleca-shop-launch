import { useMemo, useState } from "react";
import { findProduct } from "@/lib/store";
import { cn } from "@/lib/utils";
import { type DashboardData, Empty, Section, groupVisitors, money, originOf, pct } from "./shared";

const DIMENSIONS = [
  ["origin", "Origem"],
  ["campaign", "Campanha"],
  ["medium", "Conjunto (utm_medium)"],
  ["content", "Anúncio (utm_content)"],
  ["term", "Posicionamento (utm_term)"],
  ["device", "Dispositivo"],
] as const;
type Dim = (typeof DIMENSIONS)[number][0];

type Acc = {
  visitors: number;
  carts: number;
  checkouts: number;
  pix: number;
  paid: number;
  revenue: number;
};
const empty = (): Acc => ({ visitors: 0, carts: 0, checkouts: 0, pix: 0, paid: 0, revenue: 0 });

export function Sources({ data }: { data: DashboardData }) {
  const [dim, setDim] = useState<Dim>("origin");

  const rows = useMemo(() => {
    const keyOf = (t: {
      utm_source?: string | null;
      referrer?: string | null;
      utm_campaign?: string | null;
      utm_medium?: string | null;
      utm_content?: string | null;
      utm_term?: string | null;
      device?: string | null;
    }) =>
      dim === "origin"
        ? originOf(t)
        : ({
            campaign: t.utm_campaign,
            medium: t.utm_medium,
            content: t.utm_content,
            term: t.utm_term,
            device: t.device,
          }[dim] ??
            "(sem)") ||
          "(sem)";

    const m = new Map<string, Acc>();
    for (const v of groupVisitors(data.events)) {
      const first = [...v.evs].reverse().find((e) => e.utm_source || e.referrer) ?? v.last;
      const k = keyOf({ ...first, device: v.device });
      const a = m.get(k) ?? empty();
      a.visitors++;
      if (v.best >= 2) a.carts++;
      if (v.best >= 3) a.checkouts++;
      m.set(k, a);
    }
    for (const o of data.orders) {
      const t = o.tracking ?? {};
      const device = t.device === "web" ? "computador" : t.device ? "celular" : null;
      const k = keyOf({ ...t, device });
      const a = m.get(k) ?? empty();
      a.pix++;
      if (o.status === "PAID") {
        a.paid++;
        a.revenue += Number(o.amount);
      }
      m.set(k, a);
    }
    return [...m.entries()].sort(
      (a, b) => b[1].revenue - a[1].revenue || b[1].visitors - a[1].visitors,
    );
  }, [data, dim]);

  const total = rows.reduce((t, [, a]) => {
    (Object.keys(a) as (keyof Acc)[]).forEach((k) => (t[k] += a[k]));
    return t;
  }, empty());

  return (
    <Section
      title="Origens e UTMs"
      right={
        <div className="flex flex-wrap gap-1.5">
          {DIMENSIONS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setDim(k)}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold",
                dim === k ? "bg-neutral-900 text-white" : "bg-neutral-100",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      {rows.length === 0 ? (
        <Empty>Sem dados no período.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="py-2">{DIMENSIONS.find(([k]) => k === dim)?.[1]}</th>
                <th className="text-right">Visitantes</th>
                <th className="text-right">Carrinho</th>
                <th className="text-right">Checkout</th>
                <th className="text-right">PIX gerados</th>
                <th className="text-right">Pagos</th>
                <th className="text-right">Conversão</th>
                <th className="text-right">Ticket</th>
                <th className="text-right">Faturamento</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...rows, ["TOTAL", total] as const].map(([k, a]) => (
                <tr key={k} className={k === "TOTAL" ? "bg-neutral-50 font-bold" : ""}>
                  <td className="max-w-[260px] truncate py-2 font-semibold" title={k}>
                    {k}
                  </td>
                  <td className="text-right">{a.visitors}</td>
                  <td className="text-right">{a.carts}</td>
                  <td className="text-right">{a.checkouts}</td>
                  <td className="text-right">{a.pix}</td>
                  <td className="text-right">{a.paid}</td>
                  <td className="text-right">{pct(a.paid, a.visitors)}</td>
                  <td className="text-right">{money(a.paid ? a.revenue / a.paid : 0)}</td>
                  <td className="text-right font-bold">{money(a.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Visitantes contam pela primeira origem registrada. Pedidos usam as UTMs salvas no momento da
        compra.
      </p>
    </Section>
  );
}

export function Products({ data }: { data: DashboardData }) {
  const rows = useMemo(() => {
    type P = {
      name: string;
      views: number;
      carts: number;
      pix: number;
      units: number;
      revenue: number;
    };
    const m = new Map<string, P>();
    const get = (id: string, name: string) => {
      const p = m.get(id) ?? { name, views: 0, carts: 0, pix: 0, units: 0, revenue: 0 };
      m.set(id, p);
      return p;
    };
    const seen = new Set<string>();
    for (const e of data.events) {
      if (!e.product_id) continue;
      const key = `${e.event}|${e.visitor_id}|${e.product_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const p = get(e.product_id, e.product_name ?? e.product_id);
      if (e.event === "product_view") p.views++;
      if (e.event === "add_to_cart") p.carts++;
    }
    for (const o of data.orders)
      for (const i of o.items) {
        // Pacotes (2/3 unidades) contam no produto base.
        const bundle = findProduct(i.id)?.bundleOf;
        const base = bundle ? findProduct(bundle.id) : undefined;
        const p = get(bundle?.id ?? i.id, base?.name ?? i.name);
        p.pix++;
        if (o.status === "PAID") {
          p.units += i.quantity * (bundle?.units ?? 1);
          p.revenue += i.quantity * i.unit_price;
        }
      }
    return [...m.entries()].sort((a, b) => b[1].revenue - a[1].revenue || b[1].views - a[1].views);
  }, [data]);

  return (
    <Section title="Produtos">
      {rows.length === 0 ? (
        <Empty>Sem dados no período.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="py-2">Produto</th>
                <th className="text-right">Visualizações</th>
                <th className="text-right">Carrinho</th>
                <th className="text-right">PIX gerados</th>
                <th className="text-right">Unid. vendidas</th>
                <th className="text-right">Visita → carrinho</th>
                <th className="text-right">Faturamento</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(([id, p]) => (
                <tr key={id}>
                  <td className="max-w-[320px] truncate py-2" title={p.name}>
                    {p.name}
                  </td>
                  <td className="text-right">{p.views}</td>
                  <td className="text-right">{p.carts}</td>
                  <td className="text-right">{p.pix}</td>
                  <td className="text-right">{p.units}</td>
                  <td className="text-right">{pct(p.carts, p.views)}</td>
                  <td className="text-right font-bold">{money(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

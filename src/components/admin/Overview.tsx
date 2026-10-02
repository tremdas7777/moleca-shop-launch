import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type DashboardData,
  Empty,
  Section,
  Stat,
  StatusBadge,
  STEPS,
  dateTime,
  groupVisitors,
  money,
  originOf,
  pct,
} from "./shared";

export function Overview({ data, hours }: { data: DashboardData; hours: number }) {
  const s = useMemo(() => {
    const { events, orders } = data;
    const visitors = groupVisitors(events);
    const paid = orders.filter((o) => o.status === "PAID");
    const pending = orders.filter((o) => o.status === "PENDING");
    const revenue = paid.reduce((t, o) => t + Number(o.amount), 0);

    // Funil por visitante + etapas de pagamento vindas dos pedidos.
    const reach = STEPS.slice(0, 4).map(
      (st) => new Set(events.filter((e) => e.event === st.key).map((e) => e.visitor_id)).size,
    );
    const funnel = [
      ...STEPS.slice(0, 4).map((st, i) => ({ label: st.label, n: reach[i] ?? 0 })),
      { label: "Gerou o PIX", n: orders.length },
      { label: "Pagou o PIX", n: paid.length },
    ];

    // Série temporal: por hora até 48h, senão por dia.
    const byHour = hours <= 48;
    const bucket = (iso: string) => {
      const d = new Date(iso);
      return byHour
        ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}h`
        : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    };
    const series = new Map<
      string,
      { t: string; faturamento: number; pix: number; visitantes: Set<string> }
    >();
    const stepMs = byHour ? 3600_000 : 86400_000;
    const start = Date.now() - hours * 3600_000;
    for (let t = start; t <= Date.now() + stepMs; t += stepMs) {
      const k = bucket(new Date(t).toISOString());
      if (!series.has(k)) series.set(k, { t: k, faturamento: 0, pix: 0, visitantes: new Set() });
    }
    for (const o of orders) {
      const p = series.get(bucket(o.created_at));
      if (!p) continue;
      p.pix++;
      if (o.status === "PAID") p.faturamento += Number(o.amount);
    }
    for (const e of events) series.get(bucket(e.created_at))?.visitantes.add(e.visitor_id);
    const chart = [...series.values()].map((p) => ({
      t: p.t,
      faturamento: Math.round(p.faturamento * 100) / 100,
      pix: p.pix,
      visitantes: p.visitantes.size,
    }));

    const products = new Map<string, { name: string; units: number; revenue: number }>();
    for (const o of paid)
      for (const i of o.items) {
        const p = products.get(i.id) ?? { name: i.name, units: 0, revenue: 0 };
        p.units += i.quantity;
        p.revenue += i.quantity * i.unit_price;
        products.set(i.id, p);
      }
    const origins = new Map<string, { orders: number; revenue: number }>();
    for (const o of paid) {
      const k = originOf(o.tracking ?? {});
      const v = origins.get(k) ?? { orders: 0, revenue: 0 };
      v.orders++;
      v.revenue += Number(o.amount);
      origins.set(k, v);
    }

    return {
      visitors: visitors.length,
      online: visitors.filter(
        (v) => Date.now() - new Date(v.last.created_at).getTime() < 5 * 60_000,
      ).length,
      revenue,
      paid: paid.length,
      generated: orders.length,
      pendingValue: pending.reduce((t, o) => t + Number(o.amount), 0),
      ticket: paid.length ? revenue / paid.length : 0,
      funnel,
      chart,
      topProducts: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6),
      topOrigins: [...origins.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 6),
    };
  }, [data, hours]);

  return (
    <div className="space-y-5">
      {data.ordersError && (
        <p className="border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Não consegui ler a tabela de pedidos ({data.ordersError}). Veja a aba Integrações.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Faturamento pago"
          value={money(s.revenue)}
          tone="green"
          hint={`${s.paid} pedidos pagos`}
        />
        <Stat
          label="PIX gerados"
          value={String(s.generated)}
          hint={`${pct(s.paid, s.generated)} pagos`}
        />
        <Stat label="Ticket médio" value={money(s.ticket)} />
        <Stat label="Aguardando pagamento" value={money(s.pendingValue)} />
        <Stat label="Online agora" value={String(s.online)} tone="primary" hint="últimos 5 min" />
        <Stat label="Visitantes" value={String(s.visitors)} />
        <Stat label="Conversão da loja" value={pct(s.paid, s.visitors)} hint="visitantes → pago" />
        <Stat
          label="Conversão do checkout"
          value={pct(s.paid, s.funnel[3]?.n ?? 0)}
          hint="checkout → pago"
        />
      </div>

      <Section title="Faturamento e PIX gerados">
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <ComposedChart data={s.chart} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="t" tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis
                yAxisId="r"
                tick={{ fontSize: 11 }}
                width={60}
                tickFormatter={(v) => `R$${v}`}
              />
              <YAxis
                yAxisId="n"
                orientation="right"
                tick={{ fontSize: 11 }}
                width={30}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(v: number, name: string) => (name === "faturamento" ? money(v) : v)}
                labelStyle={{ fontWeight: 600 }}
              />
              <Bar
                isAnimationActive={false}
                yAxisId="r"
                dataKey="faturamento"
                fill="#059669"
                radius={[3, 3, 0, 0]}
              />
              <Line
                isAnimationActive={false}
                yAxisId="n"
                dataKey="pix"
                stroke="#dc2626"
                strokeWidth={2}
                dot={false}
              />
              <Line
                isAnimationActive={false}
                yAxisId="n"
                dataKey="visitantes"
                stroke="#94a3b8"
                strokeWidth={1.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Barras verdes: faturamento pago · linha vermelha: PIX gerados · linha cinza: visitantes
        </p>
      </Section>

      <Section title="Funil completo">
        <div className="space-y-2">
          {s.funnel.map((f, i) => {
            const top = s.funnel[0]?.n || 1;
            const prev = i ? s.funnel[i - 1]?.n || 0 : f.n;
            return (
              <div key={f.label} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 sm:w-48">{f.label}</span>
                <div className="h-7 flex-1 bg-neutral-100">
                  <div
                    className={i >= 4 ? "h-full bg-emerald-600" : "h-full bg-primary"}
                    style={{ width: `${Math.min(100, (f.n / top) * 100)}%` }}
                  />
                </div>
                <span className="w-10 text-right font-bold">{f.n}</span>
                <span className="hidden w-24 text-right text-xs text-muted-foreground sm:block">
                  {i ? `${pct(f.n, prev)} da etapa` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title="Mais vendidos">
          {s.topProducts.length === 0 ? (
            <Empty>Nenhuma venda paga no período.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {s.topProducts.map((p) => (
                <li key={p.name} className="flex justify-between gap-3 py-2">
                  <span className="line-clamp-2">{p.name}</span>
                  <span className="shrink-0 text-right">
                    <b>{money(p.revenue)}</b>
                    <span className="block text-xs text-muted-foreground">{p.units} un.</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Vendas por origem">
          {s.topOrigins.length === 0 ? (
            <Empty>Nenhuma venda paga no período.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {s.topOrigins.map(([o, v]) => (
                <li key={o} className="flex justify-between gap-3 py-2">
                  <span className="font-semibold">{o}</span>
                  <span className="text-right">
                    <b>{money(v.revenue)}</b>
                    <span className="block text-xs text-muted-foreground">{v.orders} pedidos</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Últimos pedidos">
          {data.orders.length === 0 ? (
            <Empty>Nenhum pedido no período.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {data.orders.slice(0, 7).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{o.customer_name}</span>
                    <span className="text-xs text-muted-foreground">{dateTime(o.created_at)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <b>{money(o.amount)}</b>
                    <StatusBadge status={o.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

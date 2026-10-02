import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  type DashboardData,
  Empty,
  LABEL,
  Section,
  Stat,
  StatusBadge,
  STEPS,
  ago,
  groupVisitors,
  money,
  originOf,
  time,
} from "./shared";

const ONLINE_MS = 5 * 60_000;

/** Janelas de tempo do Live view, em minutos. */
const WINDOWS = [
  [5, "5 min"],
  [15, "15 min"],
  [30, "30 min"],
  [60, "1h"],
  [180, "3h"],
  [360, "6h"],
  [720, "12h"],
  [1440, "24h"],
] as const;

function countBy<T>(list: T[], key: (t: T) => string) {
  const m = new Map<string, number>();
  for (const t of list) m.set(key(t), (m.get(key(t)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export function LiveView({ data, hours }: { data: DashboardData; hours: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [win, setWin] = useState<number>(5);
  // A janela não pode passar do período carregado no topo do painel.
  const minutes = Math.min(win, hours * 60);
  const winLabel = WINDOWS.find(([m]) => m === minutes)?.[1] ?? `${hours}h`;

  const s = useMemo(() => {
    const since = new Date(Date.now() - minutes * 60_000).toISOString();
    const visitors = groupVisitors(data.events);
    const online = visitors.filter((v) => v.last.created_at >= since);
    const inCheckout = online.filter(
      (v) => v.last.event === "checkout" || v.last.path?.startsWith("/checkout"),
    );
    const withCart = online.filter((v) => v.best >= 2);
    const checkoutValue = inCheckout.reduce((t, v) => {
      const ck = v.evs.find((e) => e.event === "checkout");
      return t + Number(ck?.value ?? 0);
    }, 0);
    const ordersByVisitor = new Map<string, typeof data.orders>();
    for (const o of data.orders) {
      const vid = o.visitor_id ?? o.tracking?.visitorId;
      if (!vid) continue;
      ordersByVisitor.set(vid, [...(ordersByVisitor.get(vid) ?? []), o]);
    }
    // Feed: eventos do funil + PIX gerado/pago vindos dos pedidos.
    const feed = [
      ...data.events.slice(0, 300).map((e) => ({
        id: e.id,
        at: e.created_at,
        label: LABEL[e.event] ?? e.event,
        detail: `${e.product_name ?? e.path ?? ""}${e.value ? ` · ${money(e.value)}` : ""}`,
        origin: originOf(e),
        tone: e.event === "checkout" ? "text-primary" : "",
      })),
      ...data.orders.flatMap((o) => [
        {
          id: `${o.id}-c`,
          at: o.created_at,
          label: "PIX gerado",
          detail: `${o.customer_name} · ${money(o.amount)}`,
          origin: originOf(o.tracking ?? {}),
          tone: "text-amber-700",
        },
        ...(o.paid_at
          ? [
              {
                id: `${o.id}-p`,
                at: o.paid_at,
                label: "💰 PIX pago",
                detail: `${o.customer_name} · ${money(o.amount)}`,
                origin: originOf(o.tracking ?? {}),
                tone: "text-emerald-700 font-bold",
              },
            ]
          : []),
      ]),
    ]
      .filter((f) => f.at >= since)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 200);

    return {
      visitors,
      online,
      inCheckout,
      withCart,
      checkoutValue,
      ordersByVisitor,
      feed,
      pages: countBy(online, (v) => v.last.path ?? "/"),
      devices: countBy(online, (v) => v.device ?? "?"),
      origins: countBy(online, (v) => v.origin),
    };
  }, [data, minutes]);

  const list = onlyOnline ? s.online : s.visitors;
  const sel = s.visitors.find((v) => v.id === selected);
  const selOrders = sel ? (s.ordersByVisitor.get(sel.id) ?? []) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold text-muted-foreground uppercase">Janela</span>
        {WINDOWS.map(([m, label]) => {
          const disabled = m > hours * 60;
          return (
            <button
              key={m}
              disabled={disabled}
              title={disabled ? "Aumente o período no topo do painel" : undefined}
              onClick={() => setWin(m)}
              className={cn(
                "border px-2.5 py-1.5 text-xs font-semibold uppercase",
                minutes === m
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-white hover:bg-neutral-50",
                disabled && "cursor-not-allowed opacity-40 hover:bg-white",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={minutes <= 5 ? "Online agora" : `Ativos · ${winLabel}`}
          value={String(s.online.length)}
          tone="primary"
          hint={`ativos nos últimos ${winLabel}`}
        />
        <Stat
          label={minutes <= 5 ? "No checkout agora" : `No checkout · ${winLabel}`}
          value={String(s.inCheckout.length)}
          hint={money(s.checkoutValue)}
        />
        <Stat
          label={`Com carrinho · ${winLabel}`}
          value={String(s.withCart.length)}
          hint="ativos com produto no carrinho"
        />
        <Stat label="Visitantes no período" value={String(s.visitors.length)} />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {(
          [
            [`Últimas páginas · ${winLabel}`, s.pages],
            [`Origem dos ativos · ${winLabel}`, s.origins],
            [`Dispositivos · ${winLabel}`, s.devices],
          ] as const
        ).map(([title, rows]) => (
          <Section key={title} title={title}>
            {rows.length === 0 ? (
              <Empty>Ninguém ativo nessa janela.</Empty>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {rows.slice(0, 8).map(([k, n]) => (
                  <li key={k} className="flex items-center gap-2">
                    <span className="flex-1 truncate">{k}</span>
                    <span className="h-2 w-20 bg-neutral-100">
                      <span
                        className="block h-full bg-primary"
                        style={{ width: `${(n / (rows[0]?.[1] || 1)) * 100}%` }}
                      />
                    </span>
                    <b className="w-6 text-right">{n}</b>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section
          title="Visitantes"
          right={
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={onlyOnline}
                onChange={(e) => setOnlyOnline(e.target.checked)}
              />
              só ativos ({winLabel})
            </label>
          }
        >
          <div className="max-h-[520px] divide-y overflow-y-auto text-sm">
            {list.length === 0 && <Empty>Nenhum visitante.</Empty>}
            {list.slice(0, 300).map((v) => {
              const isOn = Date.now() - new Date(v.last.created_at).getTime() < ONLINE_MS;
              const orders = s.ordersByVisitor.get(v.id) ?? [];
              const paid = orders.some((o) => o.status === "PAID");
              return (
                <button
                  key={v.id}
                  onClick={() => setSelected(v.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-neutral-50",
                    selected === v.id && "bg-neutral-100",
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      isOn ? "animate-pulse bg-primary" : "bg-neutral-300",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">
                      {paid
                        ? "💰 Comprou"
                        : orders.length
                          ? "Gerou PIX"
                          : LABEL[STEPS[v.best]!.key]}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {v.origin}
                      {v.campaign ? ` · ${v.campaign}` : ""} · {v.device ?? ""} · {v.last.path}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    há {ago(v.last.created_at)}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Jornada do visitante">
          {!sel ? (
            <Empty>Selecione um visitante.</Empty>
          ) : (
            <>
              <div className="mb-3 space-y-0.5 text-xs text-muted-foreground">
                <p>
                  Origem: <b className="text-foreground">{sel.origin}</b>
                  {sel.campaign && (
                    <>
                      {" "}
                      · Campanha: <b className="text-foreground">{sel.campaign}</b>
                    </>
                  )}
                </p>
                {sel.content && (
                  <p>
                    Anúncio: <b className="text-foreground">{sel.content}</b>
                  </p>
                )}
                <p>
                  Dispositivo: {sel.device ?? "?"} · {sel.evs.length} eventos
                </p>
              </div>
              {selOrders.map((o) => (
                <div
                  key={o.id}
                  className="mb-3 flex items-center justify-between border bg-neutral-50 p-2 text-sm"
                >
                  <span>
                    <b>{o.customer_name}</b> · {money(o.amount)}
                  </span>
                  <StatusBadge status={o.status} />
                </div>
              ))}
              <ol className="max-h-[420px] space-y-2 overflow-y-auto border-l-2 border-primary pl-4 text-sm">
                {[...sel.evs].reverse().map((e) => (
                  <li key={e.id}>
                    <span className="text-xs text-muted-foreground">{time(e.created_at)}</span>{" "}
                    <b>{LABEL[e.event] ?? e.event}</b>
                    <span className="block text-xs text-muted-foreground">
                      {e.product_name ?? e.path}
                      {e.value ? ` · ${money(e.value)}` : ""}
                      {e.items?.length
                        ? ` · ${e.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Section>
      </div>

      <Section title={`Tempo real · ${winLabel}`}>
        <div className="max-h-[480px] divide-y overflow-y-auto text-sm">
          {s.feed.length === 0 && <Empty>Sem eventos nessa janela.</Empty>}
          {s.feed.map((f) => (
            <div key={f.id} className="flex gap-3 py-2">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">{time(f.at)}</span>
              <span className={cn("w-36 shrink-0 font-semibold sm:w-44", f.tone)}>{f.label}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{f.detail}</span>
              <span className="hidden text-xs text-muted-foreground sm:block">{f.origin}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

import type { ReactNode } from "react";
import type { EventRow } from "@/lib/admin.functions";
import type { OrderRecord } from "@/lib/orders.server";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

export type DashboardData = {
  now: string;
  events: EventRow[];
  orders: OrderRecord[];
  ordersError: string | null;
};

export const STEPS = [
  { key: "page_view", label: "Entrou na loja" },
  { key: "product_view", label: "Viu produto" },
  { key: "add_to_cart", label: "Adicionou ao carrinho" },
  { key: "checkout", label: "Foi para o checkout" },
  { key: "purchase", label: "Comprou" },
] as const;
export const RANK: Record<string, number> = Object.fromEntries(STEPS.map((s, i) => [s.key, i]));
export const LABEL: Record<string, string> = Object.fromEntries(STEPS.map((s) => [s.key, s.label]));

export const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  PAID: { label: "Pago", className: "bg-emerald-100 text-emerald-800" },
  PENDING: { label: "Aguardando PIX", className: "bg-amber-100 text-amber-800" },
  CANCELLED: { label: "Expirado/cancelado", className: "bg-neutral-200 text-neutral-700" },
  REVERSED: { label: "Estornado", className: "bg-red-100 text-red-800" },
  DISPUTED: { label: "Em disputa", className: "bg-red-100 text-red-800" },
};

export const FULFILLMENT: Record<string, string> = {
  pending: "A enviar",
  preparing: "Separando",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export function StatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUS[status] ?? { label: status, className: "bg-neutral-100" };
  return (
    <span
      className={cn("rounded px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", s.className)}
    >
      {s.label}
    </span>
  );
}

/** Origem de um visitante/pedido: utm_source, domínio de referência ou "direto". */
export function originOf(r: { utm_source?: string | null; referrer?: string | null }) {
  if (r.utm_source) return r.utm_source.toLowerCase();
  if (r.referrer) {
    try {
      return new URL(r.referrer).hostname.replace("www.", "");
    } catch {
      // ignora: opcional
    }
  }
  return "direto";
}

export const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
export const ago = (iso: string) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return s < 60
    ? `${s}s`
    : s < 3600
      ? `${Math.round(s / 60)}min`
      : s < 86400
        ? `${Math.round(s / 3600)}h`
        : `${Math.round(s / 86400)}d`;
};
export const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : "0%");
export const money = (v: number | string | null | undefined) => formatBRL(Number(v ?? 0));

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary" | "green";
}) {
  return (
    <div
      className={cn(
        "border p-4",
        tone === "primary" && "border-primary bg-primary text-primary-foreground",
        tone === "green" && "border-emerald-600 bg-emerald-600 text-white",
        tone === "default" && "bg-white",
      )}
    >
      <p className="text-[11px] font-semibold tracking-wide uppercase opacity-75">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold sm:text-3xl">{value}</p>
      {hint && <p className="mt-0.5 text-xs opacity-75">{hint}</p>}
    </div>
  );
}

export function Section({
  title,
  right,
  children,
  className,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border bg-white p-4 sm:p-5", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold uppercase">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

/** Agrupa os eventos por visitante (mais recente primeiro). */
export function groupVisitors(events: EventRow[]) {
  const map = new Map<string, EventRow[]>();
  for (const e of events) {
    const list = map.get(e.visitor_id) ?? [];
    list.push(e);
    map.set(e.visitor_id, list);
  }
  return [...map.entries()]
    .map(([id, evs]) => {
      const last = evs[0]!;
      const best = evs.reduce((m, e) => Math.max(m, RANK[e.event] ?? 0), 0);
      const first = [...evs].reverse().find((e) => e.utm_source || e.referrer) ?? last;
      return {
        id,
        last,
        best,
        evs,
        origin: originOf(first),
        campaign: first.utm_campaign,
        content: first.utm_content,
        device: last.device,
      };
    })
    .sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
}
export type Visitor = ReturnType<typeof groupVisitors>[number];

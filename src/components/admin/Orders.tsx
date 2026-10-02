import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Download, Loader2, RefreshCw, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  listOrders,
  refreshOrderPayment,
  resendOrderIntegrations,
  updateOrderFulfillment,
} from "@/lib/admin.functions";
import type { OrderRecord } from "@/lib/orders.server";
import { findShipping } from "@/lib/shipping";
import { cn } from "@/lib/utils";
import { Empty, FULFILLMENT, Section, StatusBadge, dateTime, money, originOf } from "./shared";

const FILTERS = [
  ["all", "Todos"],
  ["PAID", "Pagos"],
  ["TO_SHIP", "A enviar"],
  ["SHIPPED", "Enviados"],
  ["PENDING", "Aguardando PIX"],
  ["CANCELLED", "Expirados"],
] as const;
type Filter = (typeof FILTERS)[number][0];

const cpf = (d: string) => d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
const phone = (d: string) => d.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3");
const fullAddress = (a: Record<string, string | undefined>) =>
  `${a["street"] ?? ""}, ${a["number"] ?? ""}${a["complement"] ? ` - ${a["complement"]}` : ""} - ${a["neighborhood"] ?? ""}, ${a["city"] ?? ""}/${a["state"] ?? ""} - CEP ${a["zipcode"] ?? ""}`;

function toCsv(orders: OrderRecord[]) {
  const head = [
    "data",
    "status",
    "envio",
    "rastreio",
    "transacao",
    "cliente",
    "email",
    "cpf",
    "telefone",
    "endereco",
    "itens",
    "frete",
    "total",
    "utm_source",
    "utm_campaign",
    "utm_content",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = orders.map((o) =>
    [
      dateTime(o.created_at),
      o.status,
      o.fulfillment_status ?? "",
      o.tracking_code ?? "",
      o.transaction_id,
      o.customer_name,
      o.customer_email,
      cpf(o.customer_document),
      phone(o.customer_phone),
      fullAddress(o.address),
      o.items.map((i) => `${i.quantity}x ${i.name}`).join(" | "),
      String(o.shipping_price).replace(".", ","),
      String(o.amount).replace(".", ","),
      o.tracking?.utm_source ?? "",
      o.tracking?.utm_campaign ?? "",
      o.tracking?.utm_content ?? "",
    ]
      .map(esc)
      .join(";"),
  );
  return "﻿" + [head.join(";"), ...rows].join("\n");
}

export function Orders() {
  const fetchOrders = useServerFn(listOrders);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const query = useQuery({
    queryKey: ["orders", filter, search],
    queryFn: () => fetchOrders({ data: { status: filter, q: search, limit: 500 } }),
    refetchInterval: 10_000,
  });
  const orders = query.data?.ok ? query.data.orders : [];
  const open = orders.find((o) => o.id === openId) ?? null;

  const exportCsv = () => {
    const blob = new Blob([toCsv(orders)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pedidos-kazza-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Section
      title="Pedidos"
      right={
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold"
        >
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </button>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold",
              filter === k ? "bg-neutral-900 text-white" : "bg-neutral-100",
            )}
          >
            {label}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar nome, e-mail, CPF, telefone ou ID"
          className="min-w-[220px] flex-1 border px-3 py-1.5 text-sm"
        />
      </div>

      {query.data && !query.data.ok && (
        <p className="mb-3 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {query.data.error} — confira a aba Integrações (tabela de pedidos).
        </p>
      )}

      {query.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <Empty>Nenhum pedido encontrado.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="py-2">Data</th>
                <th>Cliente</th>
                <th>Itens</th>
                <th>Origem</th>
                <th className="text-right">Total</th>
                <th className="pl-3">Pagamento</th>
                <th>Envio</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setOpenId(o.id)}
                  className="cursor-pointer hover:bg-neutral-50"
                >
                  <td className="py-2.5 whitespace-nowrap text-xs">{dateTime(o.created_at)}</td>
                  <td>
                    <span className="block font-semibold">{o.customer_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {o.address["city"]}/{o.address["state"]}
                    </span>
                  </td>
                  <td className="max-w-[220px] truncate text-xs">
                    {o.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                  </td>
                  <td className="text-xs">{originOf(o.tracking ?? {})}</td>
                  <td className="text-right font-bold whitespace-nowrap">{money(o.amount)}</td>
                  <td className="pl-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="text-xs">
                    {o.status === "PAID" ? FULFILLMENT[o.fulfillment_status ?? "pending"] : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && <OrderDetail order={open} onChanged={() => void query.refetch()} />}
        </SheetContent>
      </Sheet>
    </Section>
  );
}

function OrderDetail({ order, onChanged }: { order: OrderRecord; onChanged: () => void }) {
  const save = useServerFn(updateOrderFulfillment);
  const refresh = useServerFn(refreshOrderPayment);
  const resend = useServerFn(resendOrderIntegrations);
  const [fulfillment, setFulfillment] = useState(order.fulfillment_status ?? "pending");
  const [code, setCode] = useState(order.tracking_code ?? "");
  const [notes, setNotes] = useState(order.notes ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const shipping = findShipping(order.shipping_id);
  const t = order.tracking ?? {};
  const whats = `https://wa.me/55${order.customer_phone}`;

  const run = async (
    name: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) => {
    setBusy(name);
    try {
      const r = await fn();
      if (r.ok) toast.success(okMsg);
      else toast.error(r.error ?? "Erro");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
    setBusy(null);
  };

  const copy = (text: string) =>
    void navigator.clipboard.writeText(text).then(() => toast.success("Copiado!"));

  return (
    <div className="space-y-5 pb-10 text-sm">
      <SheetHeader>
        <SheetTitle className="text-left font-display text-xl uppercase">
          Pedido · {money(order.amount)}
        </SheetTitle>
      </SheetHeader>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={order.status} />
        <span className="text-xs text-muted-foreground">
          criado {dateTime(order.created_at)}
          {order.paid_at && ` · pago ${dateTime(order.paid_at)}`}
        </span>
      </div>
      <p className="text-xs break-all text-muted-foreground">
        Transação PixGate: {order.transaction_id}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          disabled={!!busy}
          onClick={() =>
            void run(
              "refresh",
              () => refresh({ data: { id: order.id } }),
              "Status consultado na PixGate",
            )
          }
          className="flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", busy === "refresh" && "animate-spin")} />{" "}
          Verificar pagamento
        </button>
        <button
          disabled={!!busy}
          onClick={() =>
            void run(
              "resend",
              () => resend({ data: { id: order.id } }),
              "Reenviado para Utmify/Meta",
            )
          }
          className="flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold"
        >
          <Send className="h-3.5 w-3.5" /> Reenviar integrações
        </button>
      </div>

      <Block title="Cliente">
        <p className="font-semibold">{order.customer_name}</p>
        <p>{order.customer_email}</p>
        <p>CPF {cpf(order.customer_document)}</p>
        <p>
          {phone(order.customer_phone)} ·{" "}
          <a href={whats} target="_blank" rel="noreferrer" className="text-emerald-700 underline">
            WhatsApp
          </a>
        </p>
      </Block>

      <Block
        title="Entrega"
        action={
          <button
            onClick={() => copy(`${order.customer_name}\n${fullAddress(order.address)}`)}
            className="text-xs underline"
          >
            <Copy className="mr-1 inline h-3 w-3" />
            copiar
          </button>
        }
      >
        <p>{fullAddress(order.address)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {shipping ? `${shipping.name} · ${shipping.eta}` : order.shipping_id} ·{" "}
          {Number(order.shipping_price) ? money(order.shipping_price) : "Grátis"}
        </p>
      </Block>

      <Block title="Itens">
        <ul className="divide-y">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-1.5">
              <span>
                {i.quantity}x {i.name}
              </span>
              <span className="shrink-0">{money(i.unit_price * i.quantity)}</span>
            </li>
          ))}
          <li className="flex justify-between py-1.5 font-bold">
            <span>Total</span>
            <span>{money(order.amount)}</span>
          </li>
        </ul>
      </Block>

      {order.status === "PAID" && (
        <Block title="Envio">
          <div className="space-y-2">
            <select
              value={fulfillment}
              onChange={(e) => setFulfillment(e.target.value)}
              className="w-full border px-2 py-2"
            >
              {Object.entries(FULFILLMENT).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código de rastreio"
              className="w-full border px-2 py-2"
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações internas"
              rows={3}
              className="w-full border px-2 py-2"
            />
            <button
              disabled={!!busy}
              onClick={() =>
                void run(
                  "save",
                  () =>
                    save({
                      data: {
                        id: order.id,
                        fulfillment_status: fulfillment as "pending",
                        tracking_code: code,
                        notes,
                      },
                    }),
                  "Envio atualizado",
                )
              }
              className="w-full bg-neutral-900 py-2.5 text-xs font-bold text-white uppercase"
            >
              Salvar envio
            </button>
            {order.shipped_at && (
              <p className="text-xs text-muted-foreground">
                Enviado em {dateTime(order.shipped_at)}
              </p>
            )}
          </div>
        </Block>
      )}

      <Block title="Origem (UTM)">
        <dl className="grid grid-cols-[110px_1fr] gap-x-2 gap-y-1 text-xs">
          {(
            [
              ["Origem", originOf(t)],
              ["utm_source", t.utm_source],
              ["utm_medium", t.utm_medium],
              ["utm_campaign", t.utm_campaign],
              ["utm_content", t.utm_content],
              ["utm_term", t.utm_term],
              ["src / sck", [t.src, t.sck].filter(Boolean).join(" / ")],
              ["Dispositivo", t.device],
              ["IP", t.ip],
              ["Pixel (fbp/fbc)", t.fbp || t.fbc ? "capturado" : "—"],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="break-all">{v || "—"}</dd>
            </div>
          ))}
        </dl>
      </Block>

      <Block title="Integrações">
        {!order.integrations || !Object.keys(order.integrations).length ? (
          <p className="text-xs text-muted-foreground">Nenhum envio registrado.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {Object.entries(order.integrations).map(([k, v]) => (
              <li key={k}>
                {v.ok ? "✅" : "❌"} <b>{k}</b> · {dateTime(v.at)}
                {v.error && <span className="block text-red-700">{v.error}</span>}
              </li>
            ))}
          </ul>
        )}
      </Block>
    </div>
  );
}

function Block({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getIntegrationStatus, testMetaCapi, testUtmify } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";
import { Section, money } from "./shared";

/** Colunas extras dos pedidos (rastreamento, envio e log de integrações). Idempotente. */
export const ORDERS_UPGRADE_SQL = `alter table public.orders
  add column if not exists tracking jsonb,
  add column if not exists visitor_id text,
  add column if not exists fulfillment_status text not null default 'pending',
  add column if not exists tracking_code text,
  add column if not exists shipped_at timestamptz,
  add column if not exists notes text,
  add column if not exists integrations jsonb;

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_visitor_idx on public.orders (visitor_id);`;

function Badge({ ok, children }: { ok: boolean | "warn"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-[11px] font-bold",
        ok === true && "bg-emerald-100 text-emerald-800",
        ok === false && "bg-red-100 text-red-800",
        ok === "warn" && "bg-amber-100 text-amber-800",
      )}
    >
      {children}
    </span>
  );
}

function Card({
  title,
  status,
  children,
}: {
  title: string;
  status: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="border bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-display text-base font-bold uppercase">{title}</h3>
        {status}
      </div>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );
}

const Secret = ({ name }: { name: string }) => (
  <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-semibold">{name}</code>
);

export function Integrations() {
  const fetchStatus = useServerFn(getIntegrationStatus);
  const runUtmify = useServerFn(testUtmify);
  const runMeta = useServerFn(testMetaCapi);
  const q = useQuery({ queryKey: ["integrations"], queryFn: () => fetchStatus() });
  const [testCode, setTestCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  if (q.isLoading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  if (!q.data?.ok) return <p className="text-sm">Não foi possível carregar as integrações.</p>;
  const s = q.data;

  const test = async (name: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(name);
    try {
      const r = await fn();
      if (r.ok) toast.success("Teste enviado com sucesso!");
      else toast.error(r.error ?? "Falhou");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falhou");
    }
    setBusy(null);
  };
  const copy = (t: string) =>
    void navigator.clipboard.writeText(t).then(() => toast.success("Copiado!"));

  return (
    <div className="space-y-5">
      <Section title="Integrações">
        <p className="text-sm text-muted-foreground">
          Chaves ficam em <b>Lovable → Cloud → Secrets</b> (nunca no código). Depois de adicionar um
          secret, publique o site de novo.
        </p>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="PixGate (PIX)"
          status={
            <Badge ok={!s.pixgate.configured ? false : s.pixgate.error ? "warn" : true}>
              {!s.pixgate.configured ? "Sem chave" : s.pixgate.error ? "Erro" : "Conectado"}
            </Badge>
          }
        >
          <p>
            Secret: <Secret name="PIXGATE_API_KEY" />
          </p>
          {typeof s.pixgate.balance === "number" && (
            <p>
              Saldo disponível: <b>{money(s.pixgate.balance)}</b>
            </p>
          )}
          {s.pixgate.error && <p className="text-red-700">{s.pixgate.error}</p>}
          <p className="text-xs text-muted-foreground">
            Webhook de confirmação (enviado automaticamente em cada PIX):{" "}
            <span className="break-all">
              {s.webhookUrl ?? "disponível só no site publicado (https)"}
            </span>
          </p>
        </Card>

        <Card
          title="Tabela de pedidos"
          status={
            <Badge
              ok={s.ordersTable === "ok" ? true : s.ordersTable === "outdated" ? "warn" : false}
            >
              {s.ordersTable === "ok"
                ? "OK"
                : s.ordersTable === "outdated"
                  ? "Atualizar"
                  : "Não criada"}
            </Badge>
          }
        >
          {s.ordersTable === "ok" ? (
            <p>Pedidos, rastreamento e envio sendo salvos.</p>
          ) : (
            <>
              <p>
                {s.ordersTable === "missing"
                  ? "Crie a tabela rodando supabase/orders.sql no SQL editor e depois o SQL abaixo."
                  : "Rode este SQL em Lovable → Cloud → SQL editor para salvar UTMs, envio e integrações:"}
              </p>
              <pre className="max-h-40 overflow-auto bg-neutral-900 p-3 text-[11px] text-neutral-100">
                {ORDERS_UPGRADE_SQL}
              </pre>
              <button
                onClick={() => copy(ORDERS_UPGRADE_SQL)}
                className="flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold"
              >
                <Copy className="h-3.5 w-3.5" /> Copiar SQL
              </button>
            </>
          )}
        </Card>

        <Card
          title="Meta (Pixel + API de Conversões)"
          status={
            <Badge ok={s.meta.capi ? true : "warn"}>
              {s.meta.capi ? "Pixel + CAPI" : "Só Pixel"}
            </Badge>
          }
        >
          <p>
            Pixel: <b>{s.meta.pixelId}</b> — eventos PageView, ViewContent, AddToCart,
            InitiateCheckout, AddPaymentInfo e Purchase (com valor).
          </p>
          <p>
            API de Conversões (Purchase pelo servidor, deduplicado com o Pixel): secret{" "}
            <Secret name="META_CAPI_TOKEN" />
            {!s.meta.capi && (
              <span className="block text-xs text-muted-foreground">
                Gere em Gerenciador de Eventos → seu Pixel → Configurações → API de Conversões →
                Gerar token de acesso.
              </span>
            )}
          </p>
          {s.meta.capi && (
            <div className="flex flex-wrap gap-2">
              <input
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                placeholder="Código de teste (ex.: TEST12345)"
                className="flex-1 border px-2 py-1.5 text-xs"
              />
              <button
                disabled={!!busy || testCode.trim().length < 3}
                onClick={() =>
                  void test("meta", () => runMeta({ data: { testEventCode: testCode.trim() } }))
                }
                className="border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {busy === "meta" ? "Enviando…" : "Enviar Purchase de teste"}
              </button>
              <p className="w-full text-xs text-muted-foreground">
                O código fica em Gerenciador de Eventos → Eventos de teste. O teste aparece só lá.
              </p>
            </div>
          )}
        </Card>

        <Card
          title="Utmify"
          status={
            <Badge ok={s.utmify.api ? true : "warn"}>
              {s.utmify.api ? "Pixel + API" : "Só Pixel"}
            </Badge>
          }
        >
          <p>
            Pixel: <b>{s.utmify.pixelId}</b> (rastreia as UTMs no site).
          </p>
          <p>
            Envio de vendas (PIX gerado → aguardando, pago → aprovado, com UTMs): secret{" "}
            <Secret name="UTMIFY_API_TOKEN" />
            {!s.utmify.api && (
              <span className="block text-xs text-muted-foreground">
                Gere em Utmify → Integrações → Webhooks → Credenciais de API → Adicionar credencial.
              </span>
            )}
          </p>
          {s.utmify.api && (
            <button
              disabled={!!busy}
              onClick={() => void test("utmify", () => runUtmify())}
              className="border px-3 py-1.5 text-xs font-semibold"
            >
              {busy === "utmify" ? "Enviando…" : "Testar conexão (não cria venda)"}
            </button>
          )}
        </Card>
      </div>
    </div>
  );
}

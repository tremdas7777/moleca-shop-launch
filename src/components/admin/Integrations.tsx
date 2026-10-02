import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  deleteMetaPixel,
  getIntegrationStatus,
  saveMetaPixel,
  saveUtmifySettings,
  testMetaPixel,
  testUtmify,
} from "@/lib/admin.functions";
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
  const q = useQuery({ queryKey: ["integrations"], queryFn: () => fetchStatus() });

  if (q.isLoading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  if (!q.data?.ok) return <p className="text-sm">Não foi possível carregar as integrações.</p>;
  const s = q.data;

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

        <MetaPixels status={s.meta} onChanged={() => void q.refetch()} />

        <UtmifyCard status={s.utmify} onChanged={() => void q.refetch()} />
      </div>
    </div>
  );
}

type MetaStatus = {
  table: boolean;
  fallbackPixelId: string;
  fallbackCapi: boolean;
  pixels: {
    id: string;
    name: string;
    pixel_id: string;
    active: boolean;
    hasToken: boolean;
    tokenHint: string | null;
  }[];
};

export const META_PIXELS_SQL = `create table if not exists public.meta_pixels (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null default '',
  pixel_id text not null,
  capi_token text,
  active boolean not null default true
);

alter table public.meta_pixels enable row level security;`;

type Draft = { id?: string; name: string; pixel_id: string; capi_token: string; active: boolean };
const emptyDraft: Draft = { name: "", pixel_id: "", capi_token: "", active: true };

function MetaPixels({ status, onChanged }: { status: MetaStatus; onChanged: () => void }) {
  const save = useServerFn(saveMetaPixel);
  const remove = useServerFn(deleteMetaPixel);
  const test = useServerFn(testMetaPixel);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [testCode, setTestCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const usingFallback = !status.table || status.pixels.length === 0;
  const activeCount = usingFallback ? 1 : status.pixels.filter((p) => p.active).length;
  const capiCount = usingFallback
    ? Number(status.fallbackCapi)
    : status.pixels.filter((p) => p.active && p.hasToken).length;

  const run = async (
    name: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) => {
    setBusy(name);
    try {
      const r = await fn();
      if (r.ok) {
        toast.success(okMsg);
        onChanged();
      } else toast.error(r.error ?? "Erro");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
    setBusy(null);
  };

  const submit = () => {
    if (!draft) return;
    void run(
      "save",
      async () => {
        const r = await save({ data: draft });
        if (r.ok) setDraft(null);
        return r;
      },
      "Pixel salvo! Já vale para o site em até 30 segundos.",
    );
  };

  return (
    <Card
      title="Meta (Pixels + API de Conversões)"
      status={
        <Badge ok={activeCount === 0 ? false : capiCount ? true : "warn"}>
          {activeCount} ativo{activeCount === 1 ? "" : "s"} · {capiCount} com CAPI
        </Badge>
      }
    >
      {!status.table ? (
        <>
          <p>
            Para cadastrar e trocar Pixels pelo painel, rode este SQL em Lovable → Cloud → SQL
            editor. Enquanto isso, o site usa o Pixel padrão <b>{status.fallbackPixelId}</b>.
          </p>
          <pre className="max-h-40 overflow-auto bg-neutral-900 p-3 text-[11px] text-neutral-100">
            {META_PIXELS_SQL}
          </pre>
          <button
            onClick={() =>
              void navigator.clipboard
                .writeText(META_PIXELS_SQL)
                .then(() => toast.success("Copiado!"))
            }
            className="flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold"
          >
            <Copy className="h-3.5 w-3.5" /> Copiar SQL
          </button>
        </>
      ) : (
        <>
          {usingFallback && (
            <p className="text-xs text-muted-foreground">
              Nenhum Pixel cadastrado: o site usa o Pixel padrão <b>{status.fallbackPixelId}</b>. Ao
              cadastrar o primeiro, só os cadastrados passam a valer.
            </p>
          )}
          <ul className="divide-y border">
            {status.pixels.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 p-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    p.active ? "bg-emerald-500" : "bg-neutral-300",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <b>{p.name || "Sem nome"}</b> · {p.pixel_id}
                  <span className="block text-xs text-muted-foreground">
                    {p.active ? "Ativo" : "Desativado"} ·{" "}
                    {p.hasToken ? `CAPI ✓ (token ${p.tokenHint})` : "sem token CAPI (só navegador)"}
                  </span>
                </span>
                <button
                  disabled={!!busy}
                  onClick={() =>
                    void run(
                      `t-${p.id}`,
                      () => save({ data: { ...p, capi_token: "", active: !p.active } }),
                      p.active ? "Pixel desativado" : "Pixel ativado",
                    )
                  }
                  className="border px-2 py-1 text-xs"
                >
                  {p.active ? "Desativar" : "Ativar"}
                </button>
                <button
                  onClick={() =>
                    setDraft({
                      id: p.id,
                      name: p.name,
                      pixel_id: p.pixel_id,
                      capi_token: "",
                      active: p.active,
                    })
                  }
                  className="border px-2 py-1 text-xs"
                >
                  Editar
                </button>
                <button
                  disabled={!!busy}
                  onClick={() => {
                    if (confirm(`Remover o Pixel ${p.pixel_id}?`))
                      void run(`d-${p.id}`, () => remove({ data: { id: p.id } }), "Pixel removido");
                  }}
                  className="border px-2 py-1 text-xs text-red-700"
                >
                  Remover
                </button>
                {p.hasToken && (
                  <button
                    disabled={!!busy || testCode.trim().length < 3}
                    onClick={() =>
                      void run(
                        `x-${p.id}`,
                        () => test({ data: { id: p.id, testEventCode: testCode.trim() } }),
                        "Purchase de teste enviado — confira em Eventos de teste",
                      )
                    }
                    className="border px-2 py-1 text-xs disabled:opacity-40"
                  >
                    Testar
                  </button>
                )}
              </li>
            ))}
            {status.pixels.length === 0 && (
              <li className="p-3 text-xs text-muted-foreground">Nenhum Pixel cadastrado ainda.</li>
            )}
          </ul>

          {status.pixels.some((p) => p.hasToken) && (
            <input
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              placeholder="Código de teste do Gerenciador de Eventos (para o botão Testar)"
              className="w-full border px-2 py-1.5 text-xs"
            />
          )}

          {draft ? (
            <div className="space-y-2 border bg-neutral-50 p-3">
              <p className="text-xs font-bold uppercase">
                {draft.id ? "Editar Pixel" : "Novo Pixel"}
              </p>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Nome (ex.: BM principal, conta nova…)"
                className="w-full border bg-white px-2 py-2 text-sm"
              />
              <input
                value={draft.pixel_id}
                onChange={(e) =>
                  setDraft({ ...draft, pixel_id: e.target.value.replace(/\D/g, "") })
                }
                inputMode="numeric"
                placeholder="ID do Pixel (só números)"
                className="w-full border bg-white px-2 py-2 text-sm"
              />
              <input
                value={draft.capi_token}
                onChange={(e) => setDraft({ ...draft, capi_token: e.target.value })}
                type="password"
                autoComplete="off"
                placeholder={
                  draft.id
                    ? "Token da API de Conversões (deixe vazio para manter)"
                    : "Token da API de Conversões (opcional)"
                }
                className="w-full border bg-white px-2 py-2 text-sm"
              />
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                />
                Ativo
              </label>
              <div className="flex gap-2">
                <button
                  disabled={!!busy || draft.pixel_id.length < 8}
                  onClick={submit}
                  className="flex-1 bg-neutral-900 py-2 text-xs font-bold text-white uppercase disabled:opacity-50"
                >
                  {busy === "save" ? "Salvando…" : "Salvar Pixel"}
                </button>
                <button onClick={() => setDraft(null)} className="border px-3 text-xs">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setDraft(emptyDraft)}
              className="w-full border-2 border-dashed py-2 text-xs font-bold uppercase"
            >
              + Adicionar Pixel
            </button>
          )}
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Todos os Pixels ativos recebem os eventos do navegador (PageView, ViewContent, AddToCart,
        InitiateCheckout, AddPaymentInfo, Purchase). Os que têm token também recebem o Purchase pelo
        servidor. Token: Gerenciador de Eventos → Pixel → Configurações → API de Conversões → Gerar
        token de acesso.
      </p>
    </Card>
  );
}

export const APP_SETTINGS_SQL = `create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;`;

type UtmifyStatus = {
  table: boolean;
  pixelId: string;
  defaultPixelId: string;
  api: boolean;
  tokenSource: "painel" | "secret" | null;
  tokenHint: string | null;
};

function UtmifyCard({ status, onChanged }: { status: UtmifyStatus; onChanged: () => void }) {
  const save = useServerFn(saveUtmifySettings);
  const runTest = useServerFn(testUtmify);
  const [token, setToken] = useState("");
  const [pixelId, setPixelId] = useState(status.pixelId);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (
    name: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) => {
    setBusy(name);
    try {
      const r = await fn();
      if (r.ok) {
        toast.success(okMsg);
        onChanged();
      } else toast.error(r.error ?? "Erro");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
    setBusy(null);
  };

  const submit = (clearToken = false) =>
    void run(
      "save",
      async () => {
        const r = await save({
          data: {
            token,
            clearToken,
            pixelId: pixelId.trim() === status.defaultPixelId ? "" : pixelId.trim(),
          },
        });
        if (r.ok) setToken("");
        return r;
      },
      clearToken ? "Token removido" : "Utmify salva! Vale em até 30 segundos.",
    );

  return (
    <Card
      title="Utmify"
      status={
        <Badge ok={status.api ? true : "warn"}>{status.api ? "Pixel + API" : "Só Pixel"}</Badge>
      }
    >
      {!status.table ? (
        <>
          <p>
            Para configurar a Utmify pelo painel, rode este SQL em Lovable → Cloud → SQL editor:
          </p>
          <pre className="max-h-40 overflow-auto bg-neutral-900 p-3 text-[11px] text-neutral-100">
            {APP_SETTINGS_SQL}
          </pre>
          <button
            onClick={() =>
              void navigator.clipboard
                .writeText(APP_SETTINGS_SQL)
                .then(() => toast.success("Copiado!"))
            }
            className="flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold"
          >
            <Copy className="h-3.5 w-3.5" /> Copiar SQL
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <p className="text-xs">
            Token da API:{" "}
            {status.tokenSource === "painel" ? (
              <b>configurado no painel ({status.tokenHint})</b>
            ) : status.tokenSource === "secret" ? (
              <b>vindo do secret UTMIFY_API_TOKEN</b>
            ) : (
              <b className="text-amber-700">não configurado</b>
            )}
          </p>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            type="password"
            autoComplete="off"
            placeholder={
              status.api
                ? "Novo token (deixe vazio para manter o atual)"
                : "Cole o token da API da Utmify"
            }
            className="w-full border px-2 py-2 text-sm"
          />
          <label className="block text-xs text-muted-foreground">
            ID do Pixel da Utmify
            <input
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
              className="mt-1 w-full border px-2 py-2 text-sm text-foreground"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={!!busy}
              onClick={() => submit()}
              className="flex-1 bg-neutral-900 py-2 text-xs font-bold text-white uppercase disabled:opacity-50"
            >
              {busy === "save" ? "Salvando…" : "Salvar"}
            </button>
            {status.api && (
              <button
                disabled={!!busy}
                onClick={() => void run("test", () => runTest(), "Conexão com a Utmify OK!")}
                className="border px-3 py-2 text-xs font-semibold"
              >
                {busy === "test" ? "Testando…" : "Testar conexão"}
              </button>
            )}
            {status.tokenSource === "painel" && (
              <button
                disabled={!!busy}
                onClick={() => {
                  if (confirm("Remover o token da Utmify?")) submit(true);
                }}
                className="border px-3 py-2 text-xs text-red-700"
              >
                Remover token
              </button>
            )}
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Vendas vão como "aguardando" ao gerar o PIX e "pago" ao pagar, com UTMs/src/sck. Token:
        Utmify → Integrações → Webhooks → Credenciais de API → Adicionar credencial. O teste não
        cria venda.
      </p>
    </Card>
  );
}

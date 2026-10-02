import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { adminLogin, adminLogout, adminStatus, getLiveData } from "@/lib/analytics.functions";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel admin | Kazza Car Care" },
      { name: "description", content: "Painel interno da loja Kazza." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Painel admin | Kazza Car Care" },
      { property: "og:description", content: "Painel interno da loja Kazza." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: AdminPage,
});

const STEPS = [
  { key: "page_view", label: "Entrou na loja" },
  { key: "product_view", label: "Viu produto" },
  { key: "add_to_cart", label: "Adicionou ao carrinho" },
  { key: "checkout", label: "Foi para o checkout Zedy" },
  { key: "purchase", label: "Pagou (voltou ao /obrigado)" },
] as const;
const RANK: Record<string, number> = Object.fromEntries(STEPS.map((s, i) => [s.key, i]));
const LABEL: Record<string, string> = Object.fromEntries(STEPS.map((s) => [s.key, s.label]));

type Row = {
  id: string;
  visitor_id: string;
  event: string;
  path: string | null;
  product_name: string | null;
  value: number | null;
  items: unknown;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer: string | null;
  device: string | null;
  created_at: string;
};

function origin(r: Row) {
  if (r.utm_source) return r.utm_source.toLowerCase();
  if (r.referrer) {
    try {
      return new URL(r.referrer).hostname.replace("www.", "");
    } catch {}
  }
  return "direto";
}
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const ago = (iso: string) => {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)}min` : `${Math.round(s / 3600)}h`;
};

function AdminPage() {
  const status = useServerFn(adminStatus);
  const q = useQuery({ queryKey: ["admin-status"], queryFn: () => status() });
  if (q.isLoading) return <div className="p-10 text-center text-sm">Carregando…</div>;
  return q.data?.admin ? <Dashboard onLogout={() => q.refetch()} /> : <Login onOk={() => q.refetch()} />;
}

function Login({ onOk }: { onOk: () => void }) {
  const login = useServerFn(adminLogin);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <form
        className="w-full max-w-sm space-y-4 border bg-white p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const password = String(new FormData(e.currentTarget).get("password") ?? "");
          const r = await login({ data: { password } });
          setBusy(false);
          if (r.ok) onOk();
          else setErr(true);
        }}
      >
        <h1 className="font-display text-2xl font-bold uppercase">Painel Kazza</h1>
        <input
          name="password"
          type="password"
          autoFocus
          placeholder="Senha"
          className="w-full border px-3 py-2.5 text-sm"
        />
        {err && <p className="text-sm text-destructive">Senha incorreta.</p>}
        <button
          disabled={busy}
          className="w-full bg-primary py-3 text-[13px] font-bold uppercase tracking-wider text-primary-foreground"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const fetchLive = useServerFn(getLiveData);
  const logout = useServerFn(adminLogout);
  const [hours, setHours] = useState(24);
  const [selected, setSelected] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["live", hours],
    queryFn: () => fetchLive({ data: { hours } }),
    refetchInterval: 5000,
  });
  const rows = (q.data?.ok ? q.data.rows : []) as Row[];

  const stats = useMemo(() => {
    const visitors = new Map<string, Row[]>();
    for (const r of rows) {
      const list = visitors.get(r.visitor_id) ?? [];
      list.push(r);
      visitors.set(r.visitor_id, list);
    }
    const reach = STEPS.map((s) => new Set(rows.filter((r) => r.event === s.key).map((r) => r.visitor_id)).size);
    const live = [...visitors.entries()]
      .map(([id, evs]) => {
        const last = evs[0]!;
        const best = evs.reduce((m, e) => Math.max(m, RANK[e.event] ?? 0), 0);
        const firstWithOrigin = [...evs].reverse().find((e) => e.utm_source || e.referrer) ?? last;
        return { id, last, best, evs, origin: origin(firstWithOrigin), campaign: firstWithOrigin.utm_campaign };
      })
      .sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
    const online = live.filter((v) => Date.now() - new Date(v.last.created_at).getTime() < 5 * 60_000);
    const byOrigin = new Map<string, { visitors: number; carts: number; checkouts: number; value: number }>();
    for (const v of live) {
      const o = byOrigin.get(v.origin) ?? { visitors: 0, carts: 0, checkouts: 0, value: 0 };
      o.visitors++;
      if (v.best >= 2) o.carts++;
      const ck = v.evs.filter((e) => e.event === "checkout");
      if (ck.length) o.checkouts++;
      o.value += ck.reduce((s, e) => s + Number(e.value ?? 0), 0);
      byOrigin.set(v.origin, o);
    }
    const checkoutValue = rows.filter((r) => r.event === "checkout").reduce((s, r) => s + Number(r.value ?? 0), 0);
    return { reach, live, online, byOrigin: [...byOrigin.entries()].sort((a, b) => b[1].visitors - a[1].visitors), checkoutValue };
  }, [rows]);

  const sel = stats.live.find((v) => v.id === selected);

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-neutral-950 px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <span className="font-display text-xl font-bold uppercase">Kazza · Live view</span>
          <span className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> ao vivo · atualiza a cada 5s
          </span>
        </div>
        <div className="flex items-center gap-2">
          {[1, 24, 168, 720].map((h) => (
            <button
              key={h}
              onClick={() => setHours(h)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase ${hours === h ? "bg-primary" : "bg-white/10"}`}
            >
              {h === 1 ? "1h" : h === 24 ? "24h" : h === 168 ? "7 dias" : "30 dias"}
            </button>
          ))}
          <button
            onClick={async () => {
              await logout();
              onLogout();
            }}
            className="ml-2 text-xs underline"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card label="Online agora (5 min)" value={String(stats.online.length)} highlight />
          <Card label="Visitantes no período" value={String(stats.live.length)} />
          <Card label="Valor enviado ao checkout" value={formatBRL(stats.checkoutValue)} />
        </div>

        <section className="border bg-white p-5">
          <h2 className="mb-4 font-display text-lg font-bold uppercase">Funil até o checkout Zedy</h2>
          <div className="space-y-2">
            {STEPS.map((s, i) => {
              const n = stats.reach[i] ?? 0;
              const top = stats.reach[0] || 1;
              const prev = i ? stats.reach[i - 1] || 0 : n;
              return (
                <div key={s.key} className="flex items-center gap-3 text-sm">
                  <span className="w-56 shrink-0">{s.label}</span>
                  <div className="h-7 flex-1 bg-neutral-100">
                    <div className="h-full bg-primary" style={{ width: `${(n / top) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right font-bold">{n}</span>
                  <span className="w-20 text-right text-xs text-muted-foreground">
                    {i ? `${prev ? Math.round((n / prev) * 100) : 0}% da etapa` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="border bg-white p-5">
            <h2 className="mb-3 font-display text-lg font-bold uppercase">Visitantes (clique para ver)</h2>
            <div className="max-h-[480px] divide-y overflow-y-auto text-sm">
              {stats.live.length === 0 && <p className="py-6 text-center text-muted-foreground">Nenhum visitante ainda.</p>}
              {stats.live.slice(0, 200).map((v) => {
                const isOn = stats.online.includes(v);
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelected(v.id)}
                    className={`flex w-full items-center gap-3 py-2.5 text-left hover:bg-neutral-50 ${selected === v.id ? "bg-neutral-100" : ""}`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${isOn ? "bg-primary" : "bg-neutral-300"}`} />
                    <span className="flex-1">
                      <span className="font-semibold">{LABEL[STEPS[v.best]!.key]}</span>
                      <span className="block text-xs text-muted-foreground">
                        {v.origin}
                        {v.campaign ? ` · ${v.campaign}` : ""} · {v.last.device ?? ""} · agora em {v.last.path}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">há {ago(v.last.created_at)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border bg-white p-5">
            <h2 className="mb-3 font-display text-lg font-bold uppercase">Linha do tempo do visitante</h2>
            {!sel ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Selecione um visitante ao lado.</p>
            ) : (
              <>
                <div className="mb-3 text-xs text-muted-foreground">
                  Origem: <b>{sel.origin}</b>
                  {sel.campaign && <> · Campanha: <b>{sel.campaign}</b></>}
                  {sel.evs.find((e) => e.utm_content)?.utm_content && (
                    <> · Anúncio: <b>{sel.evs.find((e) => e.utm_content)!.utm_content}</b></>
                  )}
                </div>
                <ol className="max-h-[440px] space-y-2 overflow-y-auto border-l-2 border-primary pl-4 text-sm">
                  {[...sel.evs].reverse().map((e) => (
                    <li key={e.id}>
                      <span className="text-xs text-muted-foreground">{time(e.created_at)}</span>{" "}
                      <b>{LABEL[e.event] ?? e.event}</b>
                      <span className="block text-xs text-muted-foreground">
                        {e.product_name ?? e.path}
                        {e.value ? ` · ${formatBRL(Number(e.value))}` : ""}
                        {Array.isArray(e.items)
                          ? ` · ${(e.items as { name: string; quantity: number }[]).map((i) => `${i.quantity}x ${i.name}`).join(", ")}`
                          : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        </div>

        <section className="border bg-white p-5">
          <h2 className="mb-3 font-display text-lg font-bold uppercase">Origem do anúncio</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Origem</th>
                <th>Visitantes</th>
                <th>Carrinho</th>
                <th>Checkout</th>
                <th>Conversão p/ checkout</th>
                <th className="text-right">Valor no checkout</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.byOrigin.map(([o, s]) => (
                <tr key={o}>
                  <td className="py-2 font-semibold">{o}</td>
                  <td>{s.visitors}</td>
                  <td>{s.carts}</td>
                  <td>{s.checkouts}</td>
                  <td>{s.visitors ? Math.round((s.checkouts / s.visitors) * 100) : 0}%</td>
                  <td className="text-right">{formatBRL(s.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="border bg-white p-5">
          <h2 className="mb-3 font-display text-lg font-bold uppercase">Eventos em tempo real</h2>
          <div className="max-h-96 divide-y overflow-y-auto text-sm">
            {rows.slice(0, 150).map((r) => (
              <div key={r.id} className="flex gap-3 py-2">
                <span className="w-20 shrink-0 text-xs text-muted-foreground">{time(r.created_at)}</span>
                <span className="w-48 shrink-0 font-semibold">{LABEL[r.event] ?? r.event}</span>
                <span className="flex-1 truncate text-muted-foreground">
                  {r.product_name ?? r.path} {r.value ? `· ${formatBRL(Number(r.value))}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">{origin(r)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Card({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`border p-5 ${highlight ? "bg-primary text-primary-foreground" : "bg-white"}`}>
      <p className="text-xs uppercase opacity-80">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}

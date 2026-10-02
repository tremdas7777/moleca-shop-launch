import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Integrations } from "@/components/admin/Integrations";
import { LiveView } from "@/components/admin/LiveView";
import { Orders } from "@/components/admin/Orders";
import { Overview } from "@/components/admin/Overview";
import { Products, Sources } from "@/components/admin/Reports";
import { money } from "@/components/admin/shared";
import { getDashboard } from "@/lib/admin.functions";
import { adminLogin, adminLogout, adminStatus } from "@/lib/analytics.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel admin | Kazza Car Care" },
      { name: "description", content: "Painel interno da loja Kazza." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  ssr: false,
  component: AdminPage,
});

const TABS = [
  ["overview", "Visão geral"],
  ["live", "Live view"],
  ["orders", "Pedidos"],
  ["sources", "Origens / UTMs"],
  ["products", "Produtos"],
  ["integrations", "Integrações"],
] as const;
type Tab = (typeof TABS)[number][0];

const PERIODS = [
  [1, "1h"],
  [24, "24h"],
  [168, "7 dias"],
  [720, "30 dias"],
  [2160, "90 dias"],
] as const;

function AdminPage() {
  const status = useServerFn(adminStatus);
  const q = useQuery({ queryKey: ["admin-status"], queryFn: () => status() });
  if (q.isLoading) return <div className="p-10 text-center text-sm">Carregando…</div>;
  return q.data?.admin ? (
    <Dashboard onLogout={() => q.refetch()} />
  ) : (
    <Login onOk={() => q.refetch()} />
  );
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
          className="w-full bg-primary py-3 text-[13px] font-bold tracking-wider text-primary-foreground uppercase"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}

/** Bipe curto quando entra uma venda nova (o navegador só toca após um clique na página). */
function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // ignora: opcional
  }
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const fetchDashboard = useServerFn(getDashboard);
  const logout = useServerFn(adminLogout);
  const [tab, setTab] = useState<Tab>("overview");
  const [hours, setHours] = useState<number>(24);
  const q = useQuery({
    queryKey: ["dashboard", hours],
    queryFn: () => fetchDashboard({ data: { hours } }),
    refetchInterval: 5000,
  });
  const data = q.data?.ok ? q.data : null;

  // Aviso de venda nova (pedido que virou pago desde a última atualização).
  const paidSeen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!data) return;
    const paid = data.orders.filter((o) => o.status === "PAID");
    if (paidSeen.current) {
      for (const o of paid) {
        if (!paidSeen.current.has(o.id)) {
          toast.success(`💰 Nova venda: ${money(o.amount)} — ${o.customer_name}`, {
            duration: 10_000,
          });
          beep();
        }
      }
    }
    paidSeen.current = new Set(paid.map((o) => o.id));
  }, [data]);

  if (q.data && !q.data.ok) {
    onLogout();
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <header className="sticky top-0 z-30 bg-neutral-950 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-bold uppercase">Kazza · Painel</span>
            <span className="flex items-center gap-1.5 text-xs text-neutral-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> ao vivo
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {PERIODS.map(([h, label]) => (
              <button
                key={h}
                onClick={() => setHours(h)}
                className={cn(
                  "px-2.5 py-1.5 text-xs font-semibold uppercase",
                  hours === h ? "bg-primary" : "bg-white/10",
                )}
              >
                {label}
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
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 sm:px-6">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2.5 text-xs font-bold uppercase",
                tab === k
                  ? "border-primary text-white"
                  : "border-transparent text-neutral-400 hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        {tab === "orders" ? (
          <Orders />
        ) : tab === "integrations" ? (
          <Integrations />
        ) : !data ? (
          <div className="p-10 text-center text-sm">Carregando dados…</div>
        ) : tab === "overview" ? (
          <Overview data={data} hours={hours} />
        ) : tab === "live" ? (
          <LiveView data={data} hours={hours} />
        ) : tab === "sources" ? (
          <Sources data={data} />
        ) : (
          <Products data={data} />
        )}
      </main>
    </div>
  );
}

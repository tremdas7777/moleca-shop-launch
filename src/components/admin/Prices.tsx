import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getProductPricing, saveProductPrices } from "@/lib/admin.functions";
import { basePrices, categories, type PriceOverrides } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Empty, Section, money } from "./shared";

/** Valores digitados por produto: preço de 1 un e de cada pacote (chave = unidades). */
type Draft = Record<string, { price: string; offers: Record<string, string> }>;

const fmt = (v: number) => v.toFixed(2).replace(".", ",");
const parse = (v: string) => {
  const t = v.trim();
  // Aceita "1.234,56", "180,00" e "180.00".
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};
const CATEGORY: Record<string, string> = {
  kits: "Kits",
  ...Object.fromEntries(categories.map((c) => [c.id, c.name])),
};

function toDraft(overrides: PriceOverrides): Draft {
  return Object.fromEntries(
    basePrices.map((b) => {
      const o = overrides[b.id];
      return [
        b.id,
        {
          price: fmt(o?.price ?? b.price),
          offers: Object.fromEntries(
            b.offers.map((of) => [String(of.units), fmt(o?.offers?.[of.units] ?? of.price)]),
          ),
        },
      ];
    }),
  );
}

export function Prices() {
  const fetchPricing = useServerFn(getProductPricing);
  const save = useServerFn(saveProductPrices);
  const q = useQuery({ queryKey: ["admin-prices"], queryFn: () => fetchPricing() });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const saved = q.data?.ok ? q.data.overrides : null;
  useEffect(() => {
    if (saved) setDraft(toDraft(saved));
  }, [saved]);

  const savedDraft = useMemo(() => (saved ? toDraft(saved) : null), [saved]);
  const changed = !!draft && !!savedDraft && JSON.stringify(draft) !== JSON.stringify(savedDraft);

  const rows = basePrices.filter((b) =>
    `${b.name} ${b.id}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  async function onSave(): Promise<void> {
    if (!draft) return;
    const overrides: PriceOverrides = {};
    for (const b of basePrices) {
      const d = draft[b.id]!;
      const price = parse(d.price);
      if (price === null) return void toast.error(`Preço inválido: ${b.name}`);
      const offers: Record<string, number> = {};
      for (const of of b.offers) {
        const v = parse(d.offers[of.units] ?? "");
        if (v === null) return void toast.error(`Preço inválido: ${b.name} (${of.units} un)`);
        offers[of.units] = v;
      }
      const isDefault = price === b.price && b.offers.every((of) => offers[of.units] === of.price);
      if (!isDefault) overrides[b.id] = b.offers.length ? { price, offers } : { price };
    }
    setBusy(true);
    const r = await save({ data: { overrides } });
    setBusy(false);
    if (!r.ok) return void toast.error(r.error);
    toast.success("Preços salvos. A loja já usa os novos valores.");
    await q.refetch();
  }

  if (q.data && !q.data.ok) return <Empty>{q.data.error}</Empty>;
  if (!draft || !q.data?.ok) return <Empty>Carregando preços…</Empty>;

  const setField = (id: string, units: string | null, value: string) =>
    setDraft((d) => {
      if (!d) return d;
      const cur = d[id]!;
      return {
        ...d,
        [id]: units
          ? { ...cur, offers: { ...cur.offers, [units]: value } }
          : { ...cur, price: value },
      };
    });

  return (
    <div className="space-y-4">
      {!q.data.table && (
        <p className="border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          A tabela <b>app_settings</b> não foi encontrada no banco. Os preços não vão ser salvos até
          ela existir.
        </p>
      )}
      <Section
        title="Preços dos produtos"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto"
              className="w-48 border px-2 py-1.5 text-xs"
            />
            <button
              disabled={!changed || busy}
              onClick={() => savedDraft && setDraft(savedDraft)}
              className="border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            >
              Descartar
            </button>
            <button
              disabled={!changed || busy}
              onClick={onSave}
              className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground uppercase disabled:opacity-40"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar preços
            </button>
          </div>
        }
      >
        <p className="mb-3 text-xs text-muted-foreground">
          Informe o preço cobrado no PIX. Na loja, o preço riscado ("de") é sempre o dobro.
        </p>
        <div className="divide-y text-sm">
          {rows.length === 0 && <Empty>Nenhum produto encontrado.</Empty>}
          {rows.map((b) => {
            const d = draft[b.id]!;
            const price = parse(d.price);
            const edited =
              price !== b.price ||
              b.offers.some((of) => parse(d.offers[of.units] ?? "") !== of.price);
            return (
              <div key={b.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1 basis-64">
                  <p className="truncate font-semibold">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY[b.category] ?? b.category}
                    {edited && (
                      <>
                        {" · "}
                        <span className="text-amber-700">
                          padrão {money(b.price)}
                          {b.offers.map((of) => ` · ${of.units} un ${money(of.price)}`)}
                        </span>
                        {" · "}
                        <button
                          className="underline"
                          onClick={() =>
                            setDraft((cur) => (cur ? { ...cur, [b.id]: toDraft({})[b.id]! } : cur))
                          }
                        >
                          voltar ao padrão
                        </button>
                      </>
                    )}
                  </p>
                </div>
                <PriceInput
                  label={b.offers.length ? "1 un" : "Preço"}
                  value={d.price}
                  hint={price ? `de ${money(price * 2)}` : "inválido"}
                  onChange={(v) => setField(b.id, null, v)}
                />
                {b.offers.map((of) => {
                  const v = parse(d.offers[of.units] ?? "");
                  return (
                    <PriceInput
                      key={of.units}
                      label={`${of.units} un`}
                      value={d.offers[of.units] ?? ""}
                      hint={v ? `${money(v / of.units)}/un` : "inválido"}
                      onChange={(val) => setField(b.id, String(of.units), val)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function PriceInput({
  label,
  value,
  hint,
  onChange,
}: {
  label: string;
  value: string;
  hint: string;
  onChange: (v: string) => void;
}) {
  const invalid = parse(value) === null;
  return (
    <label className="w-28 text-xs">
      <span className="font-semibold text-muted-foreground uppercase">{label}</span>
      <span
        className={cn("mt-0.5 flex items-center border bg-white px-2", invalid && "border-red-500")}
      >
        <span className="text-muted-foreground">R$</span>
        <input
          value={value}
          inputMode="decimal"
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-1 py-1.5 text-sm outline-none"
        />
      </span>
      <span className={cn("text-[11px] text-muted-foreground", invalid && "text-red-600")}>
        {hint}
      </span>
    </label>
  );
}

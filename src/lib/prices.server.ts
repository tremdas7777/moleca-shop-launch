import { applyPriceOverrides, type PriceOverrides } from "./store";
import { getSetting } from "./settings.server";

/** Preços salvos pelo painel (configuração `product_prices`). Sem nada salvo, devolve {}. */
export async function loadPriceOverrides(): Promise<PriceOverrides> {
  try {
    const raw = await getSetting("product_prices");
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as PriceOverrides) : {};
  } catch {
    return {};
  }
}

export async function applyStoredPrices() {
  applyPriceOverrides(await loadPriceOverrides());
}

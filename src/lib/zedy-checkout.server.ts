import { z } from "zod";
import { findProduct, type Product } from "@/lib/store";
import {
  createZedyCheckout,
  listAllZedyProducts,
  readZedyCredentials,
  type ZedyProduct,
  type ZedyVariant,
} from "@/lib/zedy-client.server";

const CATALOG_CACHE_MS = 5 * 60_000;
const MAX_CHECKOUT_LINES = 40;

let catalogCache: { at: number; products: ZedyProduct[] } | null = null;

export async function getZedyCatalog(creds: NonNullable<ReturnType<typeof readZedyCredentials>>) {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_CACHE_MS) {
    return catalogCache.products;
  }
  const catalog = await listAllZedyProducts(creds);
  catalogCache = { at: Date.now(), products: catalog };
  return catalog;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Casa pelo SKU ou slug igual ao id do produto no site; o nome é só alternativa. */
function findVariant(catalog: ZedyProduct[], product: Product): ZedyVariant | null {
  const id = normalize(product.id);
  for (const zp of catalog) {
    const bySku = zp.variants?.find((v) => v.sku && normalize(v.sku) === id);
    if (bySku) return bySku;
  }
  const byHandle = catalog.find((zp) => normalize(zp.handle ?? "") === id);
  const byTitle = catalog.find((zp) => normalize(zp.title) === normalize(product.name));
  const match = byHandle ?? byTitle;
  return match?.variants?.length === 1 ? match.variants[0]! : null;
}

export const checkoutInput = z.object({
  items: z
    .array(z.object({ id: z.string().min(1), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(MAX_CHECKOUT_LINES),
});

export type ZedyCheckoutResult =
  | { ok: true; checkoutUrl: string }
  | {
      ok: false;
      reason: "not_configured" | "missing" | "error";
      error: string;
      missing?: string[];
    };

export async function runZedyCheckout(
  items: z.infer<typeof checkoutInput>["items"],
): Promise<ZedyCheckoutResult> {
  const creds = readZedyCredentials();
  if (!creds) {
    return { ok: false, reason: "not_configured", error: "Zedy não configurada." };
  }

  try {
    const catalog = await getZedyCatalog(creds);
    const missing: string[] = [];
    const checkoutItems: { variantId: number; quantity: number }[] = [];

    for (const line of items) {
      const product = findProduct(line.id);
      const variant = product ? findVariant(catalog, product) : null;
      const variantId = Number(variant?.id);
      if (!product || !variant || !Number.isFinite(variantId)) {
        missing.push(product?.name ?? line.id);
        continue;
      }
      checkoutItems.push({ variantId, quantity: line.quantity });
    }

    if (missing.length) {
      return {
        ok: false,
        reason: "missing",
        error: "Alguns itens não estão cadastrados na Zedy.",
        missing,
      };
    }

    const checkout = await createZedyCheckout(creds, checkoutItems);
    if (!checkout.url) {
      return {
        ok: false,
        reason: "error",
        error: checkout.message || "A Zedy não retornou o link do checkout.",
      };
    }
    return { ok: true, checkoutUrl: checkout.url };
  } catch (error) {
    return {
      ok: false,
      reason: "error",
      error: error instanceof Error ? error.message : "Falha ao criar checkout na Zedy.",
    };
  }
}


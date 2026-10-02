/** Cliente HTTP da Loja API v1 (somente servidor). Nunca importe no browser. */

const ZEDY_API_BASE = "https://app.zedy.com.br/api/loja/v1";

export type ZedyVariant = {
  id: string | number;
  title: string;
  sku: string | null;
  price: number;
  availableForSale?: boolean;
};

export type ZedyProduct = {
  id: string | number;
  handle: string;
  title: string;
  price: number;
  variants: ZedyVariant[];
};

export type ZedyCredentials = {
  token: string;
  storeId: string;
};

// Fallback para cópias do projeto em outro workspace, onde os secrets não são copiados.
// Usado só no servidor; os secrets do ambiente têm prioridade.
const FALLBACK_TOKEN = "zdy_d5418a708135416c947c94685ceb082b03bfcd6a03b247b59a025683513fc9fb";
const FALLBACK_STORE_ID = "1085";

export function readZedyCredentials(): ZedyCredentials | null {
  const token = (process.env["ZEDY_API_TOKEN"] ?? "").trim() || FALLBACK_TOKEN;
  const storeId = (process.env["ZEDY_STORE_ID"] ?? "").trim() || FALLBACK_STORE_ID;
  if (!token || !storeId) return null;
  return { token, storeId };
}

async function zedyFetch(path: string, creds: ZedyCredentials, init?: RequestInit) {
  const res = await fetch(`${ZEDY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${creds.token}`,
      "X-Store-Id": creds.storeId,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  if (!res.ok) {
    const message =
      json && typeof json === "object" && "message" in json
        ? String((json as { message: unknown }).message)
        : `Zedy HTTP ${res.status}`;
    throw new Error(message);
  }
  return json;
}

export async function listAllZedyProducts(creds: ZedyCredentials): Promise<ZedyProduct[]> {
  type Page = { products?: ZedyProduct[]; pagination?: { totalPages?: number } };
  const fetchPage = (page: number) =>
    zedyFetch(`/products?page=${page}&per_page=50&sort_by=title&sort_order=asc`, creds) as Promise<Page>;
  const first = await fetchPage(1);
  const totalPages = Math.min(40, Math.max(1, Number(first.pagination?.totalPages) || 1));
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2)),
  );
  return [first, ...rest].flatMap((p) => p.products ?? []);
}

export async function createZedyCheckout(
  creds: ZedyCredentials,
  items: { variantId: number; quantity: number }[],
): Promise<{ url: string | null; message: string | undefined }> {
  const data = (await zedyFetch("/cart/create-checkout", creds, {
    method: "POST",
    body: JSON.stringify({ items }),
  })) as { checkoutUrl?: string | null; checkout_direct_url?: string | null; message?: string };
  return {
    url: data.checkout_direct_url || data.checkoutUrl || null,
    message: data.message,
  };
}

import { trackEvent, type TrackInput } from "./analytics.functions";

const VID_KEY = "kazza-vid";
const UTM_KEY = "kazza-utm";
const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
// Parâmetros extras repassados à Utmify (src/sck) e ao Meta (fbclid).
const EXTRA_FIELDS = ["src", "sck", "fbclid"] as const;

type AttrKey =
  (typeof UTM_FIELDS)[number] | (typeof EXTRA_FIELDS)[number] | "referrer" | "fbclid_at";
type Attr = Partial<Record<AttrKey, string>>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function visitorId() {
  let id = localStorage.getItem(VID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VID_KEY, id);
  }
  return id;
}

/** Guarda a origem do anúncio da primeira visita com UTM (e fbclid/gclid). */
function attribution() {
  const params = new URLSearchParams(window.location.search);
  let saved: Attr = {};
  try {
    saved = JSON.parse(localStorage.getItem(UTM_KEY) ?? "{}");
  } catch {
    // ignora: opcional
  }
  const fresh: Attr = {};
  for (const f of [...UTM_FIELDS, ...EXTRA_FIELDS]) {
    const v = params.get(f);
    if (v) fresh[f] = v.slice(0, 300);
  }
  if (fresh.fbclid) fresh.fbclid_at = String(Date.now());
  if (!fresh.utm_source && !saved.utm_source && params.get("fbclid")) fresh.utm_source = "facebook";
  if (!fresh.utm_source && !saved.utm_source && params.get("gclid")) fresh.utm_source = "google";
  if (!saved.referrer && document.referrer && !document.referrer.includes(location.host)) {
    fresh.referrer = document.referrer;
  }
  if (Object.keys(fresh).length) {
    saved = { ...saved, ...fresh };
    localStorage.setItem(UTM_KEY, JSON.stringify(saved));
  }
  return saved;
}

function cookie(name: string) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]!) : undefined;
}

export type OrderTracking = {
  visitorId: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  src?: string;
  sck?: string;
  referrer?: string;
  fbp?: string;
  fbc?: string;
  page_url?: string;
};

/** Dados de origem anexados ao pedido (Utmify, Meta CAPI e relatórios do painel). */
export function getOrderTracking(): OrderTracking {
  const a = attribution();
  const fbc =
    cookie("_fbc") ?? (a.fbclid ? `fb.1.${a.fbclid_at ?? Date.now()}.${a.fbclid}` : undefined);
  const out: OrderTracking = { visitorId: visitorId(), page_url: window.location.href };
  for (const f of [...UTM_FIELDS, "src", "sck", "referrer"] as const) {
    if (a[f]) out[f] = a[f];
  }
  const fbp = cookie("_fbp");
  if (fbp) out.fbp = fbp;
  if (fbc) out.fbc = fbc;
  return out;
}

type Payload = Omit<TrackInput, "visitorId" | keyof ReturnType<typeof base>>;

function base() {
  const a = attribution();
  return {
    utm_source: a.utm_source,
    utm_medium: a.utm_medium,
    utm_campaign: a.utm_campaign,
    utm_content: a.utm_content,
    utm_term: a.utm_term,
    referrer: a.referrer,
    device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "celular" : "computador",
    path: window.location.pathname,
  };
}

/** Eventos padrão do Meta Pixel correspondentes ao funil da loja. */
function metaPixel(payload: Payload) {
  const fbq = window.fbq;
  if (!fbq) return;
  const value = payload.value ?? undefined;
  const common = { currency: "BRL", ...(value != null ? { value } : {}) };
  if (payload.event === "product_view") {
    fbq("track", "ViewContent", {
      ...common,
      content_type: "product",
      content_ids: payload.productId ? [payload.productId] : [],
      content_name: payload.productName ?? undefined,
    });
  } else if (payload.event === "add_to_cart") {
    fbq("track", "AddToCart", {
      ...common,
      content_type: "product",
      content_ids: payload.productId ? [payload.productId] : [],
      content_name: payload.productName ?? undefined,
    });
  } else if (payload.event === "checkout") {
    fbq("track", "InitiateCheckout", {
      ...common,
      num_items: (payload.items ?? []).reduce((s, i) => s + i.quantity, 0),
    });
  }
}

export function track(payload: Payload & { path?: string }) {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/admin")) return;
  try {
    metaPixel(payload);
  } catch {
    // ignora: opcional
  }
  try {
    void trackEvent({ data: { visitorId: visitorId(), ...base(), ...payload } }).catch(() => {});
  } catch {
    // ignora: opcional
  }
}

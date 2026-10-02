import { trackEvent, type TrackInput } from "./analytics.functions";

const VID_KEY = "kazza-vid";
const UTM_KEY = "kazza-utm";
const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

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
  type Attr = Partial<Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term" | "referrer", string>>;
  let saved: Attr = {};
  try {
    saved = JSON.parse(localStorage.getItem(UTM_KEY) ?? "{}");
  } catch {}
  const fresh: Attr = {};
  for (const f of UTM_FIELDS) {
    const v = params.get(f);
    if (v) fresh[f] = v;
  }
  if (!fresh.utm_source && params.get("fbclid")) fresh.utm_source = "facebook";
  if (!fresh.utm_source && params.get("gclid")) fresh.utm_source = "google";
  if (!saved.referrer && document.referrer && !document.referrer.includes(location.host)) {
    fresh.referrer = document.referrer;
  }
  if (Object.keys(fresh).length) {
    saved = { ...saved, ...fresh };
    localStorage.setItem(UTM_KEY, JSON.stringify(saved));
  }
  return saved;
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

export function track(payload: Payload & { path?: string }) {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/admin")) return;
  try {
    void trackEvent({ data: { visitorId: visitorId(), ...base(), ...payload } }).catch(() => {});
  } catch {}
}

import { createServerFn } from "@tanstack/react-start";

/** IDs públicos dos Pixels (Meta ativos + Utmify), usados no <head> de todas as páginas. */
export const getTrackingPixels = createServerFn({ method: "GET" }).handler(async () => {
  const { activePixels } = await import("./meta-pixels.server");
  const { getSetting } = await import("./settings.server");
  const { UTMIFY_PIXEL_ID } = await import("./tracking-config");
  return {
    meta: (await activePixels()).map((p) => p.pixel_id),
    utmify: (await getSetting("utmify_pixel_id")) || UTMIFY_PIXEL_ID,
  };
});

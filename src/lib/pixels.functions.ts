import { createServerFn } from "@tanstack/react-start";

/** IDs públicos dos Pixels do Meta ativos (usados no <head> de todas as páginas). */
export const getTrackingPixels = createServerFn({ method: "GET" }).handler(async () => {
  const { activePixels } = await import("./meta-pixels.server");
  return { meta: (await activePixels()).map((p) => p.pixel_id) };
});

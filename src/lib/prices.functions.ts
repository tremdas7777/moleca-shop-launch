import { createServerFn } from "@tanstack/react-start";

/** Preços editados no painel, públicos (são os mesmos exibidos na loja). */
export const getProductPrices = createServerFn({ method: "GET" }).handler(async () => {
  const { loadPriceOverrides } = await import("./prices.server");
  return loadPriceOverrides();
});

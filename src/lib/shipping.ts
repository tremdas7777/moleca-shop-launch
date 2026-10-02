export const shippingOptions = [
  { id: "gratis", name: "Frete Grátis", eta: "7 a 10 dias úteis", price: 0 },
  { id: "padrao", name: "Frete Padrão", eta: "5 dias úteis", price: 20 },
  { id: "express", name: "Frete Express", eta: "1 a 2 dias úteis", price: 37.53 },
] as const;

export type ShippingId = (typeof shippingOptions)[number]["id"];
export type ShippingOption = (typeof shippingOptions)[number];

export function findShipping(id: string): ShippingOption | undefined {
  return shippingOptions.find((s) => s.id === id);
}

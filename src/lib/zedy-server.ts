import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const checkoutInput = z.object({
  items: z
    .array(z.object({ id: z.string().min(1), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(40),
});

export type { ZedyCheckoutResult } from "./zedy-checkout.server";

export const createZedyStoreCheckout = createServerFn({ method: "POST" })
  .validator(checkoutInput)
  .handler(async ({ data }) => {
    const { runZedyCheckout } = await import("./zedy-checkout.server");
    return runZedyCheckout(data.items);
  });

/** Pré-carrega o catálogo da Zedy (chamado ao abrir o carrinho) para o checkout abrir rápido. */
export const warmZedyCatalog = createServerFn({ method: "POST" }).handler(async () => {
  const { getZedyCatalog } = await import("./zedy-checkout.server");
  const { readZedyCredentials } = await import("./zedy-client.server");
  const creds = readZedyCredentials();
  if (!creds) return { ok: false };
  try {
    await getZedyCatalog(creds);
    return { ok: true };
  } catch {
    return { ok: false };
  }
});

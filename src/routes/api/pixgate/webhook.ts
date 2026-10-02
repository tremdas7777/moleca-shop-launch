import { createFileRoute } from "@tanstack/react-router";

/**
 * Postback da PixGate (POST JSON com `transaction_id`). O corpo não é assinado, então ele só
 * serve de aviso: o status é sempre confirmado consultando a própria PixGate antes de gravar.
 */
export const Route = createFileRoute("/api/pixgate/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as {
          transaction_id?: unknown;
        } | null;
        const transactionId = body?.transaction_id;
        if (typeof transactionId !== "string" || !transactionId || transactionId.length > 128) {
          return new Response("ok");
        }

        const { readPixGateKey, getTransactionStatus } = await import("@/lib/pixgate.server");
        const { updateOrderStatus } = await import("@/lib/orders.server");
        const apiKey = readPixGateKey();
        if (apiKey) {
          try {
            const status = await getTransactionStatus(apiKey, transactionId);
            if (status !== "PENDING") await updateOrderStatus(transactionId, status);
          } catch (err) {
            console.error("[pixgate webhook] erro ao confirmar transação", transactionId, err);
          }
        }
        return new Response("ok");
      },
    },
  },
});

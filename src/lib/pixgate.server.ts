/** Cliente HTTP da PixGate (somente servidor). Nunca importe no browser. */

import { getRequestUrl } from "@tanstack/react-start/server";

const PIXGATE_API_BASE = "https://app.pixgateip.com/api";

/** URL pública do webhook; a PixGate só aceita HTTPS em domínio público (não funciona em localhost). */
export function postbackUrl(): string | null {
  const url = getRequestUrl({ xForwardedHost: true, xForwardedProto: true });
  if (url.protocol !== "https:" || /^(localhost|127\.|\[::1\])/.test(url.hostname)) return null;
  return `${url.origin}/api/pixgate/webhook`;
}

export function readPixGateKey(): string | null {
  return (process.env["PIXGATE_API_KEY"] ?? "").trim() || null;
}

async function pixgateFetch(path: string, apiKey: string, init?: RequestInit) {
  const res = await fetch(`${PIXGATE_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Apikey: apiKey,
      ...init?.headers,
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = typeof body["message"] === "string" ? body["message"] : `HTTP ${res.status}`;
    throw new Error(`PixGate ${path}: ${message}`);
  }
  return body;
}

export type PixGateCashIn = { id: string; pix: string; value: number; status: string };

/** POST /v1/cashin — gera a cobrança PIX e devolve o código copia-e-cola. */
export async function createCashIn(
  apiKey: string,
  input: {
    nome: string;
    cpf: string;
    valor: number;
    descricao?: string;
    postback?: string;
    device?: "android" | "ios" | "web";
  },
): Promise<PixGateCashIn> {
  const body = await pixgateFetch("/v1/cashin", apiKey, {
    method: "POST",
    body: JSON.stringify({ ...input, valor: input.valor.toFixed(2) }),
  });
  if (typeof body["id"] !== "string" || typeof body["pix"] !== "string") {
    throw new Error("PixGate /v1/cashin: resposta sem id/pix");
  }
  return {
    id: body["id"],
    pix: body["pix"],
    value: Number(body["value"] ?? input.valor),
    status: String(body["status"] ?? "PENDING"),
  };
}

export type PixGateStatus = "PENDING" | "PAID" | "CANCELLED" | "REVERSED" | "DISPUTED";

/** GET /stats/:id — status atual da transação. */
export async function getTransactionStatus(apiKey: string, id: string): Promise<PixGateStatus> {
  const body = await pixgateFetch(`/stats/${encodeURIComponent(id)}`, apiKey, { method: "GET" });
  return String(body["status"] ?? "PENDING").toUpperCase() as PixGateStatus;
}

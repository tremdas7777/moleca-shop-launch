/**
 * Pixels do Meta cadastrados no painel (tabela `meta_pixels`, somente servidor).
 * Enquanto a tabela não existir ou estiver vazia, usa o Pixel fixo + secret META_CAPI_TOKEN.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { META_PIXEL_ID } from "./tracking-config";

export type MetaPixel = {
  id: string;
  created_at: string;
  name: string;
  pixel_id: string;
  capi_token: string | null;
  active: boolean;
};

export function pixelsDb() {
  return (supabaseAdmin as unknown as SupabaseClient).from("meta_pixels");
}

function fallbackPixel(): MetaPixel {
  return {
    id: "fallback",
    created_at: new Date(0).toISOString(),
    name: "Pixel padrão (código)",
    pixel_id: META_PIXEL_ID,
    capi_token: (process.env["META_CAPI_TOKEN"] ?? "").trim() || null,
    active: true,
  };
}

/** Todos os pixels cadastrados; `table: false` quando a tabela ainda não foi criada. */
export async function listPixels(): Promise<{ table: boolean; pixels: MetaPixel[] }> {
  try {
    const { data, error } = await pixelsDb().select("*").order("created_at", { ascending: true });
    if (error) return { table: false, pixels: [] };
    return { table: true, pixels: (data ?? []) as MetaPixel[] };
  } catch {
    return { table: false, pixels: [] };
  }
}

let cache: { at: number; pixels: MetaPixel[] } | null = null;

export function clearPixelCache() {
  cache = null;
}

/** Pixels ativos (cache de 30s para não consultar o banco em toda página). */
export async function activePixels(): Promise<MetaPixel[]> {
  if (cache && Date.now() - cache.at < 30_000) return cache.pixels;
  const { table, pixels } = await listPixels();
  const result = !table || pixels.length === 0 ? [fallbackPixel()] : pixels.filter((p) => p.active);
  cache = { at: Date.now(), pixels: result };
  return result;
}

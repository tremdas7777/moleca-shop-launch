/**
 * Configurações editáveis pelo painel (tabela `app_settings`, somente servidor).
 * Sem a tabela, `getSetting` devolve null e quem chama usa o secret/valor padrão.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type SettingKey = "utmify_api_token" | "utmify_pixel_id" | "product_prices";

function settingsDb() {
  return (supabaseAdmin as unknown as SupabaseClient).from("app_settings");
}

let cache: { at: number; table: boolean; values: Record<string, string> } | null = null;

async function load() {
  if (cache && Date.now() - cache.at < 30_000) return cache;
  try {
    const { data, error } = await settingsDb().select("key, value");
    const rows = (data ?? []) as { key: string; value: string | null }[];
    cache = {
      at: Date.now(),
      table: !error,
      values: Object.fromEntries(rows.filter((r) => r.value).map((r) => [r.key, r.value!])),
    };
  } catch {
    cache = { at: Date.now(), table: false, values: {} };
  }
  return cache;
}

export async function getSetting(key: SettingKey): Promise<string | null> {
  return (await load()).values[key] ?? null;
}

export async function settingsTableExists() {
  return (await load()).table;
}

/** Grava (ou apaga, com valor vazio) uma configuração. */
export async function setSetting(key: SettingKey, value: string) {
  const v = value.trim();
  const { error } = v
    ? await settingsDb().upsert({ key, value: v, updated_at: new Date().toISOString() })
    : await settingsDb().delete().eq("key", key);
  cache = null;
  return error ? error.message : null;
}

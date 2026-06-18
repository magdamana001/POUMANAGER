import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Acceso a la tabla kv de Supabase desde el servidor (rutas API).
 * Usa la service role si está disponible; si no, la anon (políticas abiertas).
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const client: SupabaseClient | null = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

const TABLE = "kv";

export async function kvGet<T>(k: string): Promise<T | undefined> {
  if (!client) return undefined;
  const { data, error } = await client.from(TABLE).select("value").eq("key", k).maybeSingle();
  if (error || !data) return undefined;
  return data.value as T;
}

export async function kvSet<T>(k: string, value: T): Promise<void> {
  if (!client) return;
  await client.from(TABLE).upsert({ key: k, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

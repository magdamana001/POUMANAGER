import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase (base de datos en la nube).
 *
 * Las credenciales se leen de variables de entorno públicas:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Si no están configuradas, el cliente es null y la app sigue funcionando
 * con la caché local (localStorage) hasta que se rellenen en .env.local.
 */

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Normaliza la URL del proyecto: el cliente añade /rest/v1 por su cuenta,
 * así que quitamos una barra final o un sufijo /rest/v1 pegado por error.
 */
const url = rawUrl?.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null;

/** Nombre de la tabla clave-valor en Supabase. */
export const KV_TABLE = "kv";

/**
 * Capa de datos del cliente. Único almacén: Supabase (Postgres en la nube),
 * accesible desde cualquier dispositivo y lugar, con sincronización en
 * tiempo real.
 *
 * - getEntry/setEntry leen y escriben en la tabla `kv` (key, value jsonb,
 *   updated_at). updated_at hace de versión para aplicar siempre lo más nuevo.
 * - subscribeEntry usa Supabase Realtime: los cambios llegan al instante.
 * - Migración: la primera vez, si la nube está vacía pero existe un dato del
 *   almacenamiento local anterior, se sube a Supabase y se descarta el local.
 */

import { KV_TABLE, supabase } from "./supabase";

export interface Entry<T> {
  value: T | undefined;
  updatedAt: number;
}

function toMs(iso: string | null | undefined): number {
  const t = iso ? new Date(iso).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
}

/** Lectura puntual del almacenamiento local antiguo, solo para migrar. */
function legacyLocalValue<T>(key: string): T | undefined {
  try {
    if (typeof localStorage === "undefined") return undefined;
    const raw = localStorage.getItem(key);
    return raw != null ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Lee una entrada de Supabase con su versión. Si la nube está vacía pero hay
 * un dato heredado en local, lo migra (lo sube y borra el local). Lanza el
 * error si la consulta falla, para que el hook no sobrescriba la nube.
 */
export async function getEntry<T>(key: string): Promise<Entry<T>> {
  if (!supabase) return { value: undefined, updatedAt: 0 };

  const { data, error } = await supabase
    .from(KV_TABLE)
    .select("value, updated_at")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;

  if (data) {
    return { value: data.value as T, updatedAt: toMs(data.updated_at) };
  }

  // Nube vacía: migrar dato heredado del almacenamiento anterior (una vez).
  const legacy = legacyLocalValue<T>(key);
  if (legacy !== undefined) {
    const ts = await setEntry(key, legacy);
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignorar */
    }
    return { value: legacy, updatedAt: ts };
  }

  return { value: undefined, updatedAt: 0 };
}

/** Guarda (upsert) en Supabase y devuelve la nueva versión. */
export async function setEntry<T>(key: string, value: T): Promise<number> {
  if (!supabase) throw new Error("Supabase no configurado");
  const updated_at = new Date().toISOString();
  const { error } = await supabase
    .from(KV_TABLE)
    .upsert({ key, value, updated_at }, { onConflict: "key" });
  if (error) throw error;
  return toMs(updated_at);
}

/** Elimina la clave en Supabase. */
export async function deleteEntry(key: string): Promise<void> {
  if (!supabase) return;
  await supabase.from(KV_TABLE).delete().eq("key", key);
}

/**
 * Suscripción en tiempo real a los cambios de una clave. Devuelve una
 * función para cancelar la suscripción.
 */
export function subscribeEntry<T>(
  key: string,
  onChange: (entry: Entry<T>) => void
): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`kv:${key}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: KV_TABLE, filter: `key=eq.${key}` },
      (payload) => {
        const row = payload.new as { value: T; updated_at: string } | undefined;
        if (row && "value" in row) {
          onChange({ value: row.value, updatedAt: toMs(row.updated_at) });
        }
      }
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

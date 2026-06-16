/**
 * Capa de datos del cliente.
 *
 * Fuente de verdad: el servidor (API /api/kv), para que los datos sean
 * compartidos y accesibles desde cualquier dispositivo que abra la webapp
 * contra el mismo servidor.
 *
 * localStorage actúa como CACHÉ offline: si el servidor no responde, se
 * sirven los últimos datos conocidos y los cambios quedan guardados en
 * local hasta la próxima escritura con conexión.
 *
 * Misma API que antes (dbGet / dbSet / dbDelete), así los módulos no cambian.
 */

const api = (key: string) => `/api/kv/${encodeURIComponent(key)}`;

// --- Caché local (espejo offline) ---

function lsGet<T>(key: string): T | undefined {
  try {
    if (typeof localStorage === "undefined") return undefined;
    const raw = localStorage.getItem(key);
    return raw != null ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function lsSet<T>(key: string, value: T): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    /* cuota superada: el servidor sigue siendo la fuente principal */
  }
}

// --- API pública ---

/**
 * Lee del servidor. Si el servidor no tiene el dato pero hay copia local
 * (p. ej. datos de una versión anterior o creados sin conexión), la sube
 * para sincronizarla. Si el servidor no responde, usa la caché local.
 */
export async function dbGet<T>(key: string): Promise<T | undefined> {
  try {
    const res = await fetch(api(key), { cache: "no-store" });
    if (res.ok) {
      const { value } = (await res.json()) as { value: T | null };
      if (value !== null && value !== undefined) {
        lsSet(key, value);
        return value;
      }
      // Servidor vacío: si hay copia local, súbela (primera sincronización).
      const cached = lsGet<T>(key);
      if (cached !== undefined) {
        void dbSet(key, cached);
        return cached;
      }
      return undefined;
    }
  } catch {
    /* sin conexión: se usa la caché local */
  }
  return lsGet<T>(key);
}

/** Guarda en la caché local (inmediato) y en el servidor. */
export async function dbSet<T>(key: string, value: T): Promise<void> {
  lsSet(key, value);
  try {
    await fetch(api(key), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
  } catch {
    /* sin conexión: el cambio queda en caché hasta reconectar */
  }
}

/** Elimina la clave en local y en el servidor. */
export async function dbDelete(key: string): Promise<void> {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  } catch {
    /* ignorar */
  }
  try {
    await fetch(api(key), { method: "DELETE" });
  } catch {
    /* ignorar */
  }
}

/** Alias histórico (la lectura ya cubre la migración desde versiones previas). */
export const dbGetMigrating = dbGet;

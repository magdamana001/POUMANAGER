/**
 * Capa de datos del cliente (fuente de verdad: el servidor).
 *
 * - getEntry/setEntry hablan con la API /api/kv y manejan la versión (__ts).
 * - localStorage es CACHÉ offline: si el servidor no responde, se sirven los
 *   últimos datos conocidos.
 * - Cola de reintentos: las escrituras que fallan sin conexión se reintentan
 *   automáticamente al recuperar la red, para no perder cambios.
 */

const api = (key: string) => `/api/kv/${encodeURIComponent(key)}`;

export interface Entry<T> {
  value: T | undefined;
  updatedAt: number;
}

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

// --- Cola de escrituras pendientes (offline) ---

const pending = new Map<string, unknown>();

async function putToServer<T>(key: string, value: T): Promise<number | undefined> {
  const res = await fetch(api(key), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("PUT falló");
  const { updatedAt } = (await res.json()) as { updatedAt: number };
  return updatedAt;
}

/** Reintenta enviar las escrituras que quedaron pendientes sin conexión. */
export async function flushPending(): Promise<void> {
  for (const [key, value] of Array.from(pending.entries())) {
    try {
      await putToServer(key, value);
      pending.delete(key);
    } catch {
      /* sigue sin conexión: se reintentará más tarde */
    }
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flushPending());
}

// --- API pública ---

/**
 * Lee una entrada del servidor con su versión. Si el servidor está vacío
 * pero hay copia local, la sube (primera sincronización). Sin conexión,
 * devuelve la caché local con versión 0 (para que el servidor la sustituya
 * en cuanto vuelva la red).
 */
export async function getEntry<T>(key: string): Promise<Entry<T>> {
  try {
    const res = await fetch(api(key), { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { value: T | null; updatedAt: number };
      if (data.value !== null && data.value !== undefined) {
        lsSet(key, data.value);
        return { value: data.value, updatedAt: data.updatedAt };
      }
      const cached = lsGet<T>(key);
      if (cached !== undefined) {
        const ts = await setEntry(key, cached);
        return { value: cached, updatedAt: ts ?? 0 };
      }
      return { value: undefined, updatedAt: data.updatedAt };
    }
  } catch {
    /* sin conexión */
  }
  return { value: lsGet<T>(key), updatedAt: 0 };
}

/**
 * Guarda en la caché local (inmediato) y en el servidor. Devuelve la nueva
 * versión, o undefined si no hubo conexión (queda en la cola de reintentos).
 */
export async function setEntry<T>(key: string, value: T): Promise<number | undefined> {
  lsSet(key, value);
  try {
    const updatedAt = await putToServer(key, value);
    pending.delete(key);
    return updatedAt;
  } catch {
    pending.set(key, value); // se reintentará al recuperar la red
    return undefined;
  }
}

/** Elimina la clave en local y en el servidor. */
export async function deleteEntry(key: string): Promise<void> {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  } catch {
    /* ignorar */
  }
  pending.delete(key);
  try {
    await fetch(api(key), { method: "DELETE" });
  } catch {
    /* ignorar */
  }
}

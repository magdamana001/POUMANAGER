"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getEntry, setEntry, subscribeEntry } from "./store";

/** Sondeo de respaldo (ms). Realtime ya empuja los cambios al instante. */
const POLL_MS = 20000;

/**
 * Estado persistido y sincronizado con Supabase.
 *
 * - Carga inicial desde la nube. Si falla, no se permite escribir para no
 *   sobrescribir datos existentes.
 * - Sincronización automática: tiempo real (Realtime) + sondeo de respaldo +
 *   al recuperar el foco/conexión. Aplica siempre la versión más reciente.
 * - `mutate` actualiza el estado local y persiste en la nube al instante.
 *
 * @param normalize Da forma al valor leído (rellena campos, mezcla defaults).
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  normalize: (stored: T | undefined) => T
) {
  const [state, setState] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  const stateRef = useRef<T>(initial);
  const tsRef = useRef<number>(0);
  const loadedRef = useRef(false);
  const normalizeRef = useRef(normalize);
  normalizeRef.current = normalize;

  const applyValue = useCallback((value: T | undefined, ts: number) => {
    const next = normalizeRef.current(value);
    stateRef.current = next;
    tsRef.current = ts;
    setState(next);
  }, []);

  /** Mutación local: actualiza y persiste en Supabase. */
  const mutate = useCallback(
    (updater: T | ((prev: T) => T)) => {
      // Evita sobrescribir la nube si aún no se cargó correctamente.
      if (!loadedRef.current) return;
      const next =
        typeof updater === "function"
          ? (updater as (prev: T) => T)(stateRef.current)
          : updater;
      stateRef.current = next;
      setState(next);
      setEntry(key, next)
        .then((ts) => {
          tsRef.current = ts;
        })
        .catch(() => {});
    },
    [key]
  );

  useEffect(() => {
    let active = true;

    const refresh = async (initialLoad: boolean) => {
      try {
        const { value, updatedAt } = await getEntry<T>(key);
        if (!active) return;
        loadedRef.current = true; // carga correcta: ya se puede escribir
        // Aplica si es la carga inicial o si la nube tiene algo más nuevo.
        if (initialLoad || updatedAt > tsRef.current) {
          applyValue(value, updatedAt);
        }
      } catch {
        /* fallo de red: se conserva el estado y no se permite escribir */
      } finally {
        if (active && initialLoad) setReady(true);
      }
    };

    void refresh(true);
    const id = setInterval(() => void refresh(false), POLL_MS);
    const onWake = () => void refresh(false);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    document.addEventListener("visibilitychange", onWake);

    // Tiempo real: aplica los cambios de otros dispositivos al instante.
    const unsubscribe = subscribeEntry<T>(key, ({ value, updatedAt }) => {
      if (!active) return;
      if (updatedAt > tsRef.current) applyValue(value, updatedAt);
    });

    return () => {
      active = false;
      clearInterval(id);
      unsubscribe();
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [key, applyValue]);

  return { state, mutate, ready };
}

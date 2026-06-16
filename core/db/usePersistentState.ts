"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getEntry, setEntry } from "./store";

/** Cada cuánto sondea el servidor para mantenerse actualizado (ms). */
const POLL_MS = 5000;

/**
 * Estado persistido y sincronizado con el servidor.
 *
 * - Carga inicial desde el servidor (con respaldo en caché offline).
 * - Sincronización automática: sondeo periódico + al recuperar el foco +
 *   al volver la conexión. Aplica siempre la versión más reciente.
 * - `mutate` actualiza el estado local y persiste en el servidor al instante.
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
  const normalizeRef = useRef(normalize);
  normalizeRef.current = normalize;

  const applyValue = useCallback((value: T | undefined, ts: number) => {
    const next = normalizeRef.current(value);
    stateRef.current = next;
    tsRef.current = ts;
    setState(next);
  }, []);

  /** Mutación local: actualiza y persiste en el servidor. */
  const mutate = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const next =
        typeof updater === "function"
          ? (updater as (prev: T) => T)(stateRef.current)
          : updater;
      stateRef.current = next;
      setState(next);
      setEntry(key, next)
        .then((ts) => {
          if (ts !== undefined) tsRef.current = ts;
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
        // Aplica si es la carga inicial o si el servidor tiene algo más nuevo.
        if (initialLoad || updatedAt > tsRef.current) {
          applyValue(value, updatedAt);
        }
      } catch {
        /* sin conexión: se conserva el estado actual */
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

    return () => {
      active = false;
      clearInterval(id);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [key, applyValue]);

  return { state, mutate, ready };
}

"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ScheduleData, Shift } from "./types";
import { uid } from "./utils";
import { usePersistentState } from "@/core/db/usePersistentState";

const STORAGE_KEY = "espou-schedule-data";
const EMPTY: ScheduleData = { shifts: [] };

function normalize(stored: ScheduleData | undefined): ScheduleData {
  return { shifts: stored?.shifts ?? [] };
}

interface StoreValue {
  ready: boolean;
  shifts: Shift[];
  addShift: (s: Omit<Shift, "id">) => void;
  updateShift: (id: string, patch: Partial<Shift>) => void;
  removeShift: (id: string) => void;
  /** Añade varios turnos a la vez (p. ej. copiar semana). */
  addShifts: (list: Omit<Shift, "id">[]) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const { state: data, mutate, ready } = usePersistentState<ScheduleData>(STORAGE_KEY, EMPTY, normalize);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      shifts: data.shifts,
      addShift: (s) => mutate((d) => ({ shifts: [...d.shifts, { ...s, id: uid() }] })),
      updateShift: (id, patch) =>
        mutate((d) => ({ shifts: d.shifts.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeShift: (id) => mutate((d) => ({ shifts: d.shifts.filter((x) => x.id !== id) })),
      addShifts: (list) =>
        mutate((d) => ({ shifts: [...d.shifts, ...list.map((s) => ({ ...s, id: uid() }))] })),
    }),
    [data, ready, mutate]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useSchedule(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useSchedule debe usarse dentro de <ScheduleProvider>");
  return ctx;
}

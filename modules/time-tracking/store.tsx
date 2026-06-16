"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Employee, TimeTrackingData, WorkSession } from "./types";
import { uid } from "./utils";
import { usePersistentState } from "@/core/db/usePersistentState";

const STORAGE_KEY = "espou-tt-data";

const EMPTY: TimeTrackingData = { employees: [], sessions: [] };

function normalize(stored: TimeTrackingData | undefined): TimeTrackingData {
  return {
    employees: stored?.employees ?? [],
    sessions: stored?.sessions ?? [],
  };
}

interface StoreValue {
  ready: boolean;
  employees: Employee[];
  sessions: WorkSession[];
  addEmployee: (e: Omit<Employee, "id">) => void;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  addSession: (s: Omit<WorkSession, "id">) => void;
  updateSession: (id: string, patch: Partial<WorkSession>) => void;
  removeSession: (id: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function TimeTrackingProvider({ children }: { children: ReactNode }) {
  const { state: data, mutate, ready } = usePersistentState<TimeTrackingData>(
    STORAGE_KEY,
    EMPTY,
    normalize
  );

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      employees: data.employees,
      sessions: data.sessions,
      addEmployee: (e) =>
        mutate((d) => ({ ...d, employees: [...d.employees, { ...e, id: uid() }] })),
      updateEmployee: (id, patch) =>
        mutate((d) => ({
          ...d,
          employees: d.employees.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      removeEmployee: (id) =>
        mutate((d) => ({
          employees: d.employees.filter((x) => x.id !== id),
          sessions: d.sessions.filter((s) => s.employeeId !== id),
        })),
      addSession: (s) =>
        mutate((d) => ({ ...d, sessions: [...d.sessions, { ...s, id: uid() }] })),
      updateSession: (id, patch) =>
        mutate((d) => ({
          ...d,
          sessions: d.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      removeSession: (id) =>
        mutate((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) })),
    }),
    [data, ready, mutate]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useTimeTracking(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useTimeTracking debe usarse dentro de <TimeTrackingProvider>");
  return ctx;
}

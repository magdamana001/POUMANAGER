"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Employee, TimeTrackingData, WorkSession } from "./types";
import { uid } from "./utils";
import { dbGetMigrating, dbSet } from "@/core/db/store";

const STORAGE_KEY = "espou-tt-data";

const EMPTY: TimeTrackingData = { employees: [], sessions: [] };

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
  const [data, setData] = useState<TimeTrackingData>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    dbGetMigrating<TimeTrackingData>(STORAGE_KEY)
      .then((stored) => {
        if (active && stored) {
          setData({
            employees: stored.employees ?? [],
            sessions: stored.sessions ?? [],
          });
        }
      })
      .catch(() => {})
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    dbSet(STORAGE_KEY, data).catch(() => {});
  }, [data, ready]);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      employees: data.employees,
      sessions: data.sessions,
      addEmployee: (e) =>
        setData((d) => ({ ...d, employees: [...d.employees, { ...e, id: uid() }] })),
      updateEmployee: (id, patch) =>
        setData((d) => ({
          ...d,
          employees: d.employees.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      removeEmployee: (id) =>
        setData((d) => ({
          employees: d.employees.filter((x) => x.id !== id),
          sessions: d.sessions.filter((s) => s.employeeId !== id),
        })),
      addSession: (s) =>
        setData((d) => ({ ...d, sessions: [...d.sessions, { ...s, id: uid() }] })),
      updateSession: (id, patch) =>
        setData((d) => ({
          ...d,
          sessions: d.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      removeSession: (id) =>
        setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) })),
    }),
    [data, ready]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useTimeTracking(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useTimeTracking debe usarse dentro de <TimeTrackingProvider>");
  return ctx;
}

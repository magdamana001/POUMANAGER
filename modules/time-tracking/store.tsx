"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Employee, TimeTrackingData, WorkSession } from "./types";
import { nowHM, todayISO, uid } from "./utils";
import { usePersistentState } from "@/core/db/usePersistentState";

const STORAGE_KEY = "espou-tt-data";

const EMPTY: TimeTrackingData = { employees: [], sessions: [] };

function normalize(stored: TimeTrackingData | undefined): TimeTrackingData {
  return {
    // Retrocompatibilidad: completa campos nuevos en empleados antiguos.
    employees: (stored?.employees ?? []).map((raw) => {
      const e = raw as Partial<Employee> & { id: string; name: string };
      return {
        id: e.id,
        name: e.name,
        position: e.position ?? "",
        phone: e.phone ?? "",
        email: e.email ?? "",
        contractHours: e.contractHours ?? 40,
        extraHourPrice: e.extraHourPrice ?? 0,
        startDate: e.startDate ?? "",
        active: e.active ?? true,
        notes: e.notes ?? "",
        color: e.color ?? "#e11d48",
        avatar: e.avatar,
      };
    }),
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
  /** Ficha la entrada del empleado (crea jornada en curso). */
  clockIn: (employeeId: string) => void;
  /** Ficha la salida (cierra la jornada en curso). */
  clockOut: (sessionId: string) => void;
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
      clockIn: (employeeId) =>
        mutate((d) => {
          // Evita dobles entradas: si ya hay una en curso, no crea otra.
          if (d.sessions.some((s) => s.employeeId === employeeId && !s.end)) return d;
          return {
            ...d,
            sessions: [
              ...d.sessions,
              { id: uid(), employeeId, date: todayISO(), start: nowHM(), end: "" },
            ],
          };
        }),
      clockOut: (sessionId) =>
        mutate((d) => ({
          ...d,
          sessions: d.sessions.map((s) =>
            s.id === sessionId && !s.end ? { ...s, end: nowHM() } : s
          ),
        })),
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

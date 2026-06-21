"use client";

/**
 * Conecta los empleados de este módulo con el sistema de cuentas del core.
 * El core define la abstracción (employeeSource); aquí la implementamos y
 * la registramos. Así el core no depende del módulo, solo al revés.
 */

import { registerEmployeeSource } from "@/core/auth/employeeSource";
import { usePersistentState } from "@/core/db/usePersistentState";
import type { Employee, TimeTrackingData } from "./types";
import { uid } from "./utils";

const STORAGE_KEY = "espou-tt-data";
const EMPTY: TimeTrackingData = { employees: [], sessions: [] };

function normalize(stored: TimeTrackingData | undefined): TimeTrackingData {
  return { employees: stored?.employees ?? [], sessions: stored?.sessions ?? [] };
}

function newEmployee(name: string): Employee {
  return {
    id: uid(),
    name: name.trim() || "Nuevo empleado",
    position: "",
    phone: "",
    email: "",
    contractHours: 40,
    extraHourPrice: 0,
    startDate: "",
    active: true,
    notes: "",
    color: "#e11d48",
  };
}

registerEmployeeSource({
  useEmployees: () => {
    const { state, mutate, ready } = usePersistentState<TimeTrackingData>(STORAGE_KEY, EMPTY, normalize);
    return {
      ready,
      employees: state.employees.map((e) => ({ id: e.id, name: e.name, position: e.position })),
      add: (name: string) => {
        const emp = newEmployee(name);
        mutate((d) => ({ ...d, employees: [...d.employees, emp] }));
        return emp.id;
      },
    };
  },
});

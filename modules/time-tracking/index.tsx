"use client";

import { useState } from "react";
import type { ModuleDefinition } from "@/core/modules/types";
import { TimeTrackingProvider } from "./store";
import "./employeeSource"; // registra la fuente de empleados para el sistema de cuentas
import { LiveTab } from "./components/LiveTab";
import { EmployeesTab } from "./components/EmployeesTab";
import { SessionsTab } from "./components/SessionsTab";
import { WeeklySummaryTab } from "./components/WeeklySummaryTab";

const TABS = [
  { id: "live", label: "Hoy", icon: "🟢" },
  { id: "summary", label: "Resumen", icon: "📊" },
  { id: "sessions", label: "Jornadas", icon: "🗓️" },
  { id: "employees", label: "Empleados", icon: "👥" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function TimeTrackingPage() {
  const [tab, setTab] = useState<TabId>("live");

  return (
    <TimeTrackingProvider>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Control horario</h1>
          <p className="text-neutral-500">
            Fichaje en vivo, jornadas, horas extra y resumen del equipo.
          </p>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-neutral-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? "border-brand text-brand"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "live" && <LiveTab />}
        {tab === "summary" && <WeeklySummaryTab />}
        {tab === "sessions" && <SessionsTab />}
        {tab === "employees" && <EmployeesTab />}
      </div>
    </TimeTrackingProvider>
  );
}

export const timeTrackingModule: ModuleDefinition = {
  id: "time-tracking",
  name: "Control horario",
  description: "Jornada de empleados, horas extra y resumen semanal en imagen.",
  icon: "⏱️",
  order: 1,
  enabledByDefault: true,
  Page: TimeTrackingPage,
  settings: {
    fields: [
      {
        key: "weekStartsMonday",
        label: "La semana empieza en lunes",
        type: "boolean",
        defaultValue: true,
        description: "Cómo se agrupan los días en el resumen semanal.",
      },
      {
        key: "defaultContractHours",
        label: "Horas de contrato por defecto",
        type: "number",
        defaultValue: 40,
        description: "Valor inicial al crear un empleado nuevo.",
      },
      {
        key: "roundingMinutes",
        label: "Redondeo de fichajes (minutos)",
        type: "number",
        defaultValue: 0,
      },
    ],
  },
};

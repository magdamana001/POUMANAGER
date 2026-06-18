"use client";

import type { ModuleDefinition } from "@/core/modules/types";
import { TimeTrackingProvider } from "@/modules/time-tracking/store";
import { ScheduleProvider } from "./store";
import { ScheduleBoard } from "./components/ScheduleBoard";

function SchedulePage() {
  return (
    // TimeTrackingProvider aporta la lista de empleados (mismo roster).
    <TimeTrackingProvider>
      <ScheduleProvider>
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-bold tracking-tight">Cuadrante de turnos</h1>
            <p className="text-neutral-500">
              Planifica los turnos de cada empleado y visualiza la distribución de horas por día y semana.
            </p>
          </header>
          <ScheduleBoard />
        </div>
      </ScheduleProvider>
    </TimeTrackingProvider>
  );
}

export const scheduleModule: ModuleDefinition = {
  id: "schedule",
  name: "Cuadrante",
  description: "Calendario de turnos por empleado con distribución de horas.",
  icon: "📆",
  order: 2,
  enabledByDefault: true,
  Page: SchedulePage,
};

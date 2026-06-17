"use client";

import { useMemo, useState } from "react";
import { useTimeTracking } from "../store";
import { useRounding, useTick } from "../hooks";
import {
  formatHours,
  formatMinutes,
  isOpen,
  liveMinutes,
  nowHM,
  sessionNetHours,
  todayISO,
} from "../utils";

export function LiveTab() {
  const { employees, sessions, clockIn, clockOut, addSession } = useTimeTracking();
  const rounding = useRounding();
  useTick(15000); // refresca los contadores en vivo

  const today = todayISO();
  const activeEmployees = employees.filter((e) => e.active);
  const [showManual, setShowManual] = useState(false);

  const openByEmployee = useMemo(() => {
    const map = new Map<string, ReturnType<typeof Object>>();
    for (const s of sessions) if (isOpen(s)) map.set(s.employeeId, s);
    return map as Map<string, (typeof sessions)[number]>;
  }, [sessions]);

  /** Horas de hoy del empleado (cerradas + jornada en curso). */
  const todayHours = (employeeId: string): number => {
    let h = 0;
    for (const s of sessions) {
      if (s.employeeId !== employeeId || s.date !== today) continue;
      h += isOpen(s) ? liveMinutes(s) / 60 : sessionNetHours(s, rounding);
    }
    return h;
  };

  const workingNow = activeEmployees.filter((e) => openByEmployee.has(e.id)).length;
  const teamTodayHours = activeEmployees.reduce((a, e) => a + todayHours(e.id), 0);

  const now = new Date();
  const dateLabel = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (activeEmployees.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        No hay empleados activos. Añádelos en la pestaña «Empleados».
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen del día */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Fecha" value={<span className="capitalize">{dateLabel}</span>} />
        <StatCard label="Trabajando ahora" value={`${workingNow} / ${activeEmployees.length}`} />
        <StatCard label="Horas de hoy (equipo)" value={formatHours(teamTodayHours)} />
      </div>

      {/* Fichaje manual con fecha y hora */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <button
          onClick={() => setShowManual((v) => !v)}
          className="flex w-full items-center justify-between text-left text-sm font-medium"
        >
          <span>🕒 Fichaje manual (elegir día y hora)</span>
          <span className="text-neutral-400">{showManual ? "▲" : "▼"}</span>
        </button>
        {showManual && (
          <ManualClockIn employees={activeEmployees} onAdd={addSession} />
        )}
      </div>

      {/* Tarjetas de fichaje */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {activeEmployees.map((e) => {
          const open = openByEmployee.get(e.id);
          const hours = todayHours(e.id);
          return (
            <div
              key={e.id}
              className={`rounded-xl border bg-white p-4 shadow-sm ${
                open ? "border-green-400" : "border-neutral-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.name}</p>
                  <p className="truncate text-xs text-neutral-500">{e.position || "—"}</p>
                </div>
                {open && (
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    en curso
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-xs text-neutral-400">Hoy</p>
                  <p className="text-lg font-bold">{formatHours(hours)}</p>
                </div>
                {open && (
                  <p className="text-right text-xs text-neutral-500">
                    Entrada {open.start}
                    <br />
                    <span className="font-medium text-green-700">
                      {formatMinutes(liveMinutes(open))} trabajados
                    </span>
                  </p>
                )}
              </div>

              {open ? (
                <button
                  onClick={() => clockOut(open.id)}
                  className="mt-3 w-full rounded-lg bg-neutral-800 py-2 text-sm font-medium text-white hover:bg-neutral-900"
                >
                  ⏹ Fichar salida
                </button>
              ) : (
                <button
                  onClick={() => clockIn(e.id)}
                  className="mt-3 w-full rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  ▶ Fichar entrada
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

import type { Employee, WorkSession } from "../types";

/** Fichaje manual: elige empleado, día y hora; admite jornada partida. */
function ManualClockIn({
  employees,
  onAdd,
}: {
  employees: Employee[];
  onAdd: (s: Omit<WorkSession, "id">) => void;
}) {
  const [form, setForm] = useState({
    employeeId: "",
    date: todayISO(),
    start: nowHM(),
    end: "",
    split: false,
    start2: "18:00",
    end2: "22:00",
    note: "",
  });
  const [done, setDone] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    const employeeId = form.employeeId || employees[0]?.id;
    if (!employeeId) return;
    onAdd({
      employeeId,
      date: form.date,
      start: form.start,
      end: form.end, // vacío => jornada en curso
      note: form.note,
    });
    if (form.split && form.start2 && form.end2) {
      onAdd({
        employeeId,
        date: form.date,
        start: form.start2,
        end: form.end2,
        note: form.note ? `${form.note} (2º tramo)` : "2º tramo",
      });
    }
    setDone(true);
    setForm((f) => ({ ...f, note: "", end: "" }));
    setTimeout(() => setDone(false), 2500);
  };

  const input =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";

  if (employees.length === 0) {
    return <p className="mt-3 text-sm text-neutral-400">No hay empleados activos.</p>;
  }

  return (
    <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">Empleado</label>
          <select className={input} value={form.employeeId || employees[0]?.id} onChange={(e) => set({ employeeId: e.target.value })}>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Día</label>
          <input type="date" className={input} value={form.date} onChange={(e) => set({ date: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Entrada</label>
            <input type="time" className={input} value={form.start} onChange={(e) => set({ start: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Salida</label>
            <input type="time" className={input} value={form.end} onChange={(e) => set({ end: e.target.value })} />
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-brand" checked={form.split} onChange={(e) => set({ split: e.target.checked })} />
        Jornada partida (2º tramo)
      </label>

      {form.split && (
        <div className="grid grid-cols-2 gap-2 sm:w-1/2">
          <div>
            <label className="mb-1 block text-sm font-medium">Entrada 2</label>
            <input type="time" className={input} value={form.start2} onChange={(e) => set({ start2: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Salida 2</label>
            <input type="time" className={input} value={form.end2} onChange={(e) => set({ end2: e.target.value })} />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={submit} className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90">
          Registrar fichaje
        </button>
        <span className="text-xs text-neutral-400">
          Deja «Salida» vacío para dejar la jornada en curso.
        </span>
        {done && <span className="text-sm font-medium text-green-600">✓ Registrado</span>}
      </div>
    </div>
  );
}

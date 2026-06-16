"use client";

import { useMemo, useState } from "react";
import { useTimeTracking } from "../store";
import { formatHours, sessionHours, todayISO } from "../utils";

export function SessionsTab() {
  const { employees, sessions, addSession, removeSession } = useTimeTracking();
  const [form, setForm] = useState({
    employeeId: "",
    date: todayISO(),
    start: "09:00",
    end: "17:00",
    note: "",
  });
  const [filterEmployee, setFilterEmployee] = useState("");

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    const employeeId = form.employeeId || employees[0]?.id;
    if (!employeeId) return;
    addSession({ ...form, employeeId });
    setForm((f) => ({ ...f, note: "" }));
  };

  const visible = useMemo(
    () =>
      [...sessions]
        .filter((s) => !filterEmployee || s.employeeId === filterEmployee)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [sessions, filterEmployee]
  );

  const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? "—";
  const empColor = (id: string) => employees.find((e) => e.id === id)?.color ?? "#999";

  const input =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";

  if (employees.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        Primero añade empleados en la pestaña «Empleados».
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Registrar jornada</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-sm font-medium">Empleado</label>
            <select
              className={input}
              value={form.employeeId || employees[0]?.id}
              onChange={(e) => set({ employeeId: e.target.value })}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Fecha</label>
            <input type="date" className={input} value={form.date} onChange={(e) => set({ date: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Entrada</label>
            <input type="time" className={input} value={form.start} onChange={(e) => set({ start: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Salida</label>
            <input type="time" className={input} value={form.end} onChange={(e) => set({ end: e.target.value })} />
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Nota (opcional)</label>
            <input
              className={input}
              value={form.note}
              onChange={(e) => set({ note: e.target.value })}
              placeholder="Turno de tarde, evento..."
            />
          </div>
          <button
            onClick={submit}
            className="rounded-lg bg-brand px-5 py-2 font-medium text-white hover:opacity-90"
          >
            Registrar ({formatHours(sessionHours({ ...form, id: "", employeeId: "" }))})
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Jornadas registradas</h2>
          <select
            className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
          >
            <option value="">Todos</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        {visible.length === 0 ? (
          <p className="text-sm text-neutral-400">No hay jornadas registradas.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {visible.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: empColor(s.employeeId) }} />
                <span className="w-28 shrink-0 font-medium">{empName(s.employeeId)}</span>
                <span className="w-24 shrink-0 text-neutral-500">{s.date}</span>
                <span className="w-28 shrink-0 text-neutral-500">
                  {s.start}–{s.end}
                </span>
                <span className="w-16 shrink-0 font-medium">{formatHours(sessionHours(s))}</span>
                <span className="min-w-0 flex-1 truncate text-neutral-400">{s.note}</span>
                <button
                  onClick={() => removeSession(s.id)}
                  className="shrink-0 rounded px-2 py-1 text-red-500 hover:bg-red-50"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

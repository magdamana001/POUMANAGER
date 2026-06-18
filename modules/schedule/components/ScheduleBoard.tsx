"use client";

import { useMemo, useState } from "react";
import { useTimeTracking } from "@/modules/time-tracking/store";
import { sessionNetHours, isOpen } from "@/modules/time-tracking/utils";
import { EmployeeAvatar } from "@/modules/time-tracking/components/EmployeeAvatar";
import { useSchedule } from "../store";
import type { Shift } from "../types";
import {
  addDays,
  DAY_NAMES,
  dayNumber,
  formatHours,
  getWeekStart,
  shiftDuration,
  todayISO,
  weekDays,
  weekLabel,
} from "../utils";

const COLORS = ["#e11d48", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

interface EditorTarget {
  shift?: Shift;
  employeeId: string;
  date: string;
}

export function ScheduleBoard() {
  const { employees, sessions } = useTimeTracking();
  const { shifts, addShift, updateShift, removeShift, addShifts } = useSchedule();
  const [weekStart, setWeekStart] = useState(getWeekStart(todayISO()));
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [showSessions, setShowSessions] = useState(true);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const days = weekDays(weekStart);
  const today = todayISO();
  const activeEmployees = useMemo(() => employees.filter((e) => e.active), [employees]);
  const visibleEmployees = useMemo(
    () => activeEmployees.filter((e) => !hidden.has(e.id)),
    [activeEmployees, hidden]
  );

  const toggleHidden = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const cellShifts = (empId: string, date: string) =>
    shifts
      .filter((s) => s.employeeId === empId && s.date === date)
      .sort((a, b) => (a.start < b.start ? -1 : 1));

  const cellSessions = (empId: string, date: string) =>
    sessions
      .filter((s) => s.employeeId === empId && s.date === date)
      .sort((a, b) => (a.start < b.start ? -1 : 1));

  const empWeekTotal = (empId: string) =>
    days.reduce((sum, d) => sum + cellShifts(empId, d).reduce((a, s) => a + shiftDuration(s), 0), 0);
  const empWeekWorked = (empId: string) =>
    days.reduce((sum, d) => sum + cellSessions(empId, d).reduce((a, s) => a + sessionNetHours(s), 0), 0);
  const dayTotal = (date: string) =>
    visibleEmployees.reduce((sum, e) => sum + cellShifts(e.id, date).reduce((a, s) => a + shiftDuration(s), 0), 0);
  const grandTotal = days.reduce((a, d) => a + dayTotal(d), 0);

  const copyPreviousWeek = () => {
    const prevStart = addDays(weekStart, -7);
    const prevDays = weekDays(prevStart);
    const prev = shifts.filter((s) => prevDays.includes(s.date));
    if (prev.length === 0) {
      alert("La semana anterior no tiene turnos que copiar.");
      return;
    }
    if (!confirm(`Copiar ${prev.length} turnos de la semana anterior a esta semana?`)) return;
    addShifts(
      prev.map((s) => {
        const { ...rest } = s;
        return { employeeId: rest.employeeId, date: addDays(rest.date, 7), start: rest.start, end: rest.end, role: rest.role, color: rest.color, note: rest.note };
      })
    );
  };

  if (activeEmployees.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-sm text-neutral-400">
        No hay empleados activos. Añádelos en «Control horario → Empleados».
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-neutral-100">‹</button>
          <span className="min-w-[140px] text-center text-sm font-semibold">{weekLabel(weekStart)}</span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-neutral-100">›</button>
          <button onClick={() => setWeekStart(getWeekStart(todayISO()))} className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-neutral-100">Hoy</button>
        </div>
        <button onClick={copyPreviousWeek} className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-neutral-100">
          ⧉ Copiar semana anterior
        </button>
        <button
          onClick={() => setShowSessions((v) => !v)}
          className={`rounded-xl border px-3 py-2 text-sm font-medium shadow-sm transition ${
            showSessions ? "border-brand bg-brand-soft text-brand" : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          🕒 Fichajes reales
        </button>
        <span className="rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-600 sm:ml-auto">
          Total semana: <span className="font-semibold text-neutral-800">{formatHours(grandTotal)}</span>
        </span>
      </div>

      {showSessions && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-brand" /> Turno planificado</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded border border-dashed border-neutral-400 bg-neutral-50" /> 🕒 Fichaje real</span>
        </div>
      )}

      {/* Filtro de empleados */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-neutral-400">Ver:</span>
        {activeEmployees.map((e) => {
          const on = !hidden.has(e.id);
          return (
            <button
              key={e.id}
              onClick={() => toggleHidden(e.id)}
              className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition ${
                on ? "border-neutral-300 bg-white text-neutral-700" : "border-neutral-200 bg-neutral-100 text-neutral-400 line-through"
              }`}
            >
              <EmployeeAvatar name={e.name} color={e.color} avatar={e.avatar} size={18} />
              {e.name}
            </button>
          );
        })}
        {hidden.size > 0 && (
          <button onClick={() => setHidden(new Set())} className="rounded-full px-2 py-1 text-xs font-medium text-brand hover:underline">
            Ver todos
          </button>
        )}
      </div>

      {/* Cuadrante */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="sticky left-0 z-10 w-44 bg-neutral-50 p-3 text-left text-xs font-semibold uppercase text-neutral-400">Empleado</th>
              {days.map((d, i) => (
                <th key={d} className={`p-2 text-center text-xs font-semibold ${d === today ? "text-brand" : "text-neutral-500"}`}>
                  <div>{DAY_NAMES[i]}</div>
                  <div className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${d === today ? "bg-brand text-white" : "text-neutral-400"}`}>{dayNumber(d)}</div>
                </th>
              ))}
              <th className="w-16 p-2 text-center text-xs font-semibold uppercase text-neutral-400">Total</th>
            </tr>
          </thead>
          <tbody>
            {visibleEmployees.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100 last:border-0">
                <td className="sticky left-0 z-10 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <EmployeeAvatar name={e.name} color={e.color} avatar={e.avatar} size={32} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{e.name}</p>
                      <p className="truncate text-[11px] text-neutral-400">{e.position || "—"}</p>
                    </div>
                  </div>
                </td>
                {days.map((d) => {
                  const list = cellShifts(e.id, d);
                  return (
                    <td key={d} className="border-l border-neutral-100 p-1 align-top">
                      <div className="flex min-h-[52px] flex-col gap-1">
                        {list.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setEditor({ shift: s, employeeId: e.id, date: d })}
                            className="rounded-md px-1.5 py-1 text-left text-[11px] font-medium leading-tight text-white transition hover:opacity-90"
                            style={{ backgroundColor: s.color || e.color }}
                            title={s.role || ""}
                          >
                            {s.start}–{s.end}
                            {s.role ? <span className="block truncate opacity-90">{s.role}</span> : null}
                          </button>
                        ))}
                        <button
                          onClick={() => setEditor({ employeeId: e.id, date: d })}
                          className="rounded-md border border-dashed border-neutral-200 py-0.5 text-xs text-neutral-300 transition hover:border-brand hover:text-brand"
                        >
                          ＋
                        </button>
                        {showSessions &&
                          cellSessions(e.id, d).map((ses) => (
                            <div
                              key={ses.id}
                              className="flex items-center gap-1 rounded-md border border-dashed bg-neutral-50 px-1.5 py-0.5 text-[10px] leading-tight text-neutral-500"
                              style={{ borderColor: e.color }}
                              title="Fichaje real (Control horario)"
                            >
                              🕒 {ses.start}
                              {isOpen(ses) ? (
                                <span className="font-medium text-green-600">· en curso</span>
                              ) : (
                                <>–{ses.end}</>
                              )}
                            </div>
                          ))}
                      </div>
                    </td>
                  );
                })}
                <td className="border-l border-neutral-100 p-2 text-center text-sm font-semibold">
                  {formatHours(empWeekTotal(e.id))}
                  {showSessions && (
                    <div className="text-[10px] font-normal text-neutral-400" title="Horas fichadas">
                      🕒 {formatHours(empWeekWorked(e.id))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-200 bg-neutral-50">
              <td className="sticky left-0 z-10 bg-neutral-50 p-3 text-xs font-semibold uppercase text-neutral-400">Total/día</td>
              {days.map((d) => (
                <td key={d} className="p-2 text-center text-sm font-medium text-neutral-600">{dayTotal(d) > 0 ? formatHours(dayTotal(d)) : "—"}</td>
              ))}
              <td className="p-2 text-center text-sm font-bold text-brand">{formatHours(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {editor && (
        <ShiftEditor
          target={editor}
          defaultColor={activeEmployees.find((e) => e.id === editor.employeeId)?.color ?? COLORS[0]}
          employees={activeEmployees.map((e) => ({ id: e.id, name: e.name, color: e.color }))}
          onClose={() => setEditor(null)}
          onSave={(s) => {
            if (editor.shift) updateShift(editor.shift.id, s);
            else addShift(s);
            setEditor(null);
          }}
          onDelete={editor.shift ? () => { removeShift(editor.shift!.id); setEditor(null); } : undefined}
        />
      )}
    </div>
  );
}

function ShiftEditor({
  target,
  employees,
  defaultColor,
  onSave,
  onClose,
  onDelete,
}: {
  target: EditorTarget;
  employees: { id: string; name: string; color: string }[];
  defaultColor: string;
  onSave: (s: Omit<Shift, "id">) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const s = target.shift;
  const [form, setForm] = useState({
    employeeId: s?.employeeId ?? target.employeeId,
    date: s?.date ?? target.date,
    start: s?.start ?? "09:00",
    end: s?.end ?? "17:00",
    role: s?.role ?? "",
    color: s?.color ?? defaultColor,
    note: s?.note ?? "",
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const input = "w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">{s ? "Editar turno" : "Nuevo turno"}</h3>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-neutral-400 hover:bg-neutral-100">✕</button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Empleado</label>
              <select className={input} value={form.employeeId} onChange={(e) => set({ employeeId: e.target.value })}>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Fecha</label>
              <input type="date" className={input} value={form.date} onChange={(e) => set({ date: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Inicio</label>
              <input type="time" className={input} value={form.start} onChange={(e) => set({ start: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Fin</label>
              <input type="time" className={input} value={form.end} onChange={(e) => set({ end: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Etiqueta (opcional)</label>
            <input className={input} value={form.role} onChange={(e) => set({ role: e.target.value })} placeholder="Mañana, barra, cocina…" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">Color del turno</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => set({ color: c })} style={{ backgroundColor: c }} className={`h-6 w-6 rounded-full ${form.color === c ? "ring-2 ring-offset-2 ring-neutral-400" : ""}`} />
              ))}
              <input type="color" value={form.color} onChange={(e) => set({ color: e.target.value })} className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
            </div>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={() => onSave(form)} className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]">
            {s ? "Guardar" : "Añadir turno"}
          </button>
          {onDelete && (
            <button onClick={onDelete} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">Eliminar</button>
          )}
        </div>
      </div>
    </div>
  );
}

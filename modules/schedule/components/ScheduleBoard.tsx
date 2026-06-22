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
  isWeekend,
  shiftDuration,
  shiftHours,
  SHIFT_PRESETS,
  todayISO,
  weekDays,
  weekRangeLabel,
} from "../utils";

const COLORS = ["#e11d48", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

interface EditorTarget {
  shift?: Shift;
  employeeId: string;
  date: string;
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-0.5 text-xl font-bold tracking-tight" style={accent ? { color: accent } : undefined}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}

export function ScheduleBoard() {
  const { employees, sessions, isAdmin } = useTimeTracking();
  const { shifts, addShift, updateShift, removeShift, addShifts, removeShifts } = useSchedule();
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
  const dayCoverage = (date: string) =>
    visibleEmployees.filter((e) => cellShifts(e.id, date).length > 0).length;

  // KPIs de la semana visible.
  const weekShiftIds = useMemo(
    () => shifts.filter((s) => days.includes(s.date) && visibleEmployees.some((e) => e.id === s.employeeId)).map((s) => s.id),
    [shifts, days, visibleEmployees]
  );
  const grandTotal = days.reduce((a, d) => a + dayTotal(d), 0);
  const workedTotal = visibleEmployees.reduce((a, e) => a + empWeekWorked(e.id), 0);
  const totalShifts = weekShiftIds.length;
  const daysCovered = days.filter((d) => dayTotal(d) > 0).length;
  const delta = Math.round((workedTotal - grandTotal) * 100) / 100;

  const copyPreviousWeek = () => {
    const prevStart = addDays(weekStart, -7);
    const prevDays = weekDays(prevStart);
    const prev = shifts.filter((s) => prevDays.includes(s.date));
    if (prev.length === 0) {
      alert("La semana anterior no tiene turnos que copiar.");
      return;
    }
    if (!confirm(`¿Copiar ${prev.length} turnos de la semana anterior a esta semana?`)) return;
    addShifts(
      prev.map((s) => ({ employeeId: s.employeeId, date: addDays(s.date, 7), start: s.start, end: s.end, role: s.role, color: s.color, note: s.note }))
    );
  };

  const clearWeek = () => {
    if (weekShiftIds.length === 0) return;
    if (!confirm(`¿Eliminar los ${weekShiftIds.length} turnos de esta semana?`)) return;
    removeShifts(weekShiftIds);
  };

  if (activeEmployees.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-sm text-neutral-400">
        No hay empleados activos. Añádelos en «Control horario → Empleados».
      </div>
    );
  }

  const navBtn = "rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm transition hover:bg-neutral-100";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className={navBtn} aria-label="Semana anterior">‹</button>
          <div className="min-w-[150px] text-center">
            <p className="text-sm font-semibold leading-tight">{weekRangeLabel(weekStart)}</p>
            <p className="text-[11px] text-neutral-400">Semana</p>
          </div>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className={navBtn} aria-label="Semana siguiente">›</button>
          <button onClick={() => setWeekStart(getWeekStart(todayISO()))} className={navBtn}>Hoy</button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowSessions((v) => !v)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium shadow-sm transition ${
              showSessions ? "border-brand bg-brand-soft text-brand" : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            🕒 Fichajes reales
          </button>
          {isAdmin && (
            <>
              <button onClick={copyPreviousWeek} className={navBtn}>⧉ Copiar semana</button>
              <button onClick={clearWeek} className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50">🗑 Limpiar</button>
            </>
          )}
          <button onClick={() => typeof window !== "undefined" && window.print()} className={navBtn}>🖨 Imprimir</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Horas planificadas" value={formatHours(grandTotal)} accent="var(--brand-color)" />
        <Stat
          label="Horas fichadas"
          value={formatHours(workedTotal)}
          sub={delta === 0 ? "igual a lo previsto" : delta > 0 ? `+${formatHours(delta)} sobre plan` : `${formatHours(delta)} bajo plan`}
        />
        <Stat label="Turnos" value={String(totalShifts)} sub={`${visibleEmployees.length} empleados`} />
        <Stat label="Cobertura" value={`${daysCovered}/7`} sub="días con turnos" />
      </div>

      {/* Leyenda + filtro */}
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
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
        {showSessions && (
          <div className="flex shrink-0 flex-wrap items-center gap-3 text-[11px] text-neutral-500">
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-brand" /> Planificado</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded border border-dashed border-neutral-400 bg-neutral-50" /> 🕒 Fichaje</span>
          </div>
        )}
      </div>

      {/* Cuadrante */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="sticky left-0 z-10 w-48 bg-neutral-50 p-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">Empleado</th>
              {days.map((d, i) => (
                <th
                  key={d}
                  className={`p-2 text-center text-xs font-semibold ${isWeekend(d) ? "bg-neutral-100/70" : ""} ${d === today ? "text-brand" : "text-neutral-500"}`}
                >
                  <div>{DAY_NAMES[i]}</div>
                  <div className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm ${d === today ? "bg-brand text-white shadow-sm" : "text-neutral-500"}`}>
                    {dayNumber(d)}
                  </div>
                  <div className="mt-0.5 text-[10px] font-normal text-neutral-400">{dayCoverage(d)}👤</div>
                </th>
              ))}
              <th className="w-28 p-2 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">Semana</th>
            </tr>
          </thead>
          <tbody>
            {visibleEmployees.map((e) => {
              const planned = empWeekTotal(e.id);
              const worked = empWeekWorked(e.id);
              const contract = e.contractHours || 0;
              const pct = contract > 0 ? Math.min(100, Math.round((planned / contract) * 100)) : 0;
              const over = contract > 0 && planned > contract;
              return (
                <tr key={e.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/40">
                  <td className="sticky left-0 z-10 bg-white p-3">
                    <div className="flex items-center gap-2">
                      <EmployeeAvatar name={e.name} color={e.color} avatar={e.avatar} size={34} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{e.name}</p>
                        <p className="truncate text-[11px] text-neutral-400">{e.position || "—"}</p>
                      </div>
                    </div>
                  </td>
                  {days.map((d) => {
                    const list = cellShifts(e.id, d);
                    return (
                      <td key={d} className={`border-l border-neutral-100 p-1 align-top ${isWeekend(d) ? "bg-neutral-50/40" : ""}`}>
                        <div className="flex min-h-[56px] flex-col gap-1">
                          {list.map((s) => {
                            const dur = shiftDuration(s);
                            const chip = (
                              <>
                                <span className="flex items-center justify-between gap-1">
                                  <span>{s.start}–{s.end}</span>
                                  <span className="rounded bg-black/15 px-1 text-[9px] font-semibold">{formatHours(dur)}</span>
                                </span>
                                {s.role ? <span className="block truncate text-[10px] opacity-90">{s.role}</span> : null}
                              </>
                            );
                            return isAdmin ? (
                              <button
                                key={s.id}
                                onClick={() => setEditor({ shift: s, employeeId: e.id, date: d })}
                                className="rounded-md px-1.5 py-1 text-left text-[11px] font-medium leading-tight text-white shadow-sm transition hover:opacity-90"
                                style={{ backgroundColor: s.color || e.color }}
                                title={s.note || s.role || ""}
                              >
                                {chip}
                              </button>
                            ) : (
                              <div
                                key={s.id}
                                className="rounded-md px-1.5 py-1 text-left text-[11px] font-medium leading-tight text-white"
                                style={{ backgroundColor: s.color || e.color }}
                                title={s.note || s.role || ""}
                              >
                                {chip}
                              </div>
                            );
                          })}
                          {isAdmin && (
                            <button
                              onClick={() => setEditor({ employeeId: e.id, date: d })}
                              className="rounded-md border border-dashed border-neutral-200 py-0.5 text-xs text-neutral-300 transition hover:border-brand hover:text-brand"
                            >
                              ＋
                            </button>
                          )}
                          {showSessions &&
                            cellSessions(e.id, d).map((ses) => (
                              <div
                                key={ses.id}
                                className="flex items-center gap-1 rounded-md border border-dashed bg-neutral-50 px-1.5 py-0.5 text-[10px] leading-tight text-neutral-500"
                                style={{ borderColor: e.color }}
                                title="Fichaje real (Control horario)"
                              >
                                🕒 {ses.start}
                                {isOpen(ses) ? <span className="font-medium text-green-600">· en curso</span> : <>–{ses.end}</>}
                              </div>
                            ))}
                        </div>
                      </td>
                    );
                  })}
                  <td className="border-l border-neutral-100 p-2 align-top">
                    <p className="text-center text-sm font-semibold">
                      {formatHours(planned)}
                      {contract > 0 && <span className="text-[11px] font-normal text-neutral-400"> / {contract}h</span>}
                    </p>
                    {contract > 0 && (
                      <div className="mx-auto mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: over ? "#d97706" : "var(--brand-color)" }} />
                      </div>
                    )}
                    {showSessions && (
                      <p className="mt-1 text-center text-[10px] text-neutral-400" title="Horas fichadas">🕒 {formatHours(worked)}</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-200 bg-neutral-50">
              <td className="sticky left-0 z-10 bg-neutral-50 p-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Total/día</td>
              {days.map((d) => (
                <td key={d} className={`p-2 text-center text-sm font-medium text-neutral-600 ${isWeekend(d) ? "bg-neutral-100/70" : ""}`}>
                  {dayTotal(d) > 0 ? formatHours(dayTotal(d)) : "—"}
                </td>
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
  const duration = shiftHours(form.start, form.end);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[1px] sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">{s ? "Editar turno" : "Nuevo turno"}</h3>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-neutral-400 hover:bg-neutral-100">✕</button>
        </div>

        {/* Plantillas rápidas */}
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium text-neutral-500">Plantillas</p>
          <div className="flex flex-wrap gap-1.5">
            {SHIFT_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => set({ start: p.start, end: p.end, role: p.label, color: p.color })}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1 text-xs transition hover:bg-neutral-50"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.label}
                <span className="text-neutral-400">{p.start}–{p.end}</span>
              </button>
            ))}
          </div>
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

          <div className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-sm">
            <span className="text-neutral-500">Duración</span>
            <span className="font-semibold">{formatHours(duration)}{form.end < form.start ? " (cruza medianoche)" : ""}</span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Etiqueta (opcional)</label>
            <input className={input} value={form.role} onChange={(e) => set({ role: e.target.value })} placeholder="Mañana, barra, cocina…" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Nota (opcional)</label>
            <input className={input} value={form.note} onChange={(e) => set({ note: e.target.value })} placeholder="Detalles del turno" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">Color del turno</label>
            <div className="flex flex-wrap items-center gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => set({ color: c })} style={{ backgroundColor: c }} className={`h-6 w-6 rounded-full transition ${form.color === c ? "ring-2 ring-offset-2 ring-neutral-400" : ""}`} />
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

"use client";

import { useMemo, useState } from "react";
import { useTimeTracking } from "../store";
import { useRounding } from "../hooks";
import { formatHours, isOpen, sessionNetHours, todayISO } from "../utils";

const EMPTY_FORM = {
  employeeId: "",
  date: todayISO(),
  start: "09:00",
  end: "17:00",
  breakMinutes: 0,
  note: "",
  split: false,
  start2: "18:00",
  end2: "22:00",
};

export function SessionsTab() {
  const { employees, sessions, addSession, updateSession, removeSession } = useTimeTracking();
  const rounding = useRounding();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterEmployee, setFilterEmployee] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    const employeeId = form.employeeId || employees[0]?.id;
    if (!employeeId) return;
    const payload = {
      employeeId,
      date: form.date,
      start: form.start,
      end: form.end,
      breakMinutes: Number(form.breakMinutes) || 0,
      note: form.note,
    };
    if (editingId) {
      updateSession(editingId, payload);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      return;
    }
    addSession(payload);
    // Jornada partida: crea un segundo tramo el mismo día.
    if (form.split && form.start2 && form.end2) {
      addSession({
        employeeId,
        date: form.date,
        start: form.start2,
        end: form.end2,
        breakMinutes: 0,
        note: form.note ? `${form.note} (2º tramo)` : "2º tramo",
      });
    }
    setForm((f) => ({ ...EMPTY_FORM, employeeId: f.employeeId, date: f.date }));
  };

  const startEdit = (id: string) => {
    const s = sessions.find((x) => x.id === id);
    if (!s) return;
    setEditingId(id);
    setForm({
      employeeId: s.employeeId,
      date: s.date,
      start: s.start,
      end: s.end || "17:00",
      breakMinutes: s.breakMinutes ?? 0,
      note: s.note ?? "",
      split: false,
      start2: "18:00",
      end2: "22:00",
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const visible = useMemo(
    () =>
      [...sessions]
        .filter((s) => !filterEmployee || s.employeeId === filterEmployee)
        .filter((s) => !from || s.date >= from)
        .filter((s) => !to || s.date <= to)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.start < b.start ? 1 : -1)),
    [sessions, filterEmployee, from, to]
  );

  const totalNet = visible.reduce((a, s) => a + sessionNetHours(s, rounding), 0);

  const emp = (id: string) => employees.find((e) => e.id === id);
  const previewNet =
    sessionNetHours({ ...form, id: "", employeeId: "" }, rounding) +
    (!editingId && form.split
      ? sessionNetHours(
          { id: "", employeeId: "", date: form.date, start: form.start2, end: form.end2 },
          rounding
        )
      : 0);

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
      <div className={`rounded-xl border bg-white p-5 shadow-sm ${editingId ? "border-brand" : "border-neutral-200"}`}>
        <h2 className="mb-4 font-semibold">{editingId ? "Editar jornada" : "Registrar jornada"}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
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
          <div>
            <label className="mb-1 block text-sm font-medium">Pausa (min)</label>
            <input
              type="number"
              min={0}
              className={input}
              value={form.breakMinutes}
              onChange={(e) => set({ breakMinutes: Number(e.target.value) })}
            />
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
          <button onClick={submit} className="rounded-lg bg-brand px-5 py-2 font-medium text-white hover:opacity-90">
            {editingId ? "Guardar" : "Registrar"} ({formatHours(previewNet)})
          </button>
          {editingId && (
            <button onClick={cancelEdit} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100">
              Cancelar
            </button>
          )}
        </div>

        {!editingId && (
          <div className="mt-3 border-t border-neutral-100 pt-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand"
                checked={form.split}
                onChange={(e) => set({ split: e.target.checked })}
              />
              Jornada partida (2º tramo el mismo día)
            </label>
            {form.split && (
              <div className="mt-2 grid grid-cols-2 gap-3 sm:w-1/3">
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
          </div>
        )}
      </div>

      {/* Filtros + listado */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <h2 className="mr-auto font-semibold">Jornadas registradas</h2>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Empleado</label>
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
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Desde</label>
            <input type="date" className="rounded-lg border border-neutral-300 px-2 py-1 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">Hasta</label>
            <input type="date" className="rounded-lg border border-neutral-300 px-2 py-1 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {(from || to || filterEmployee) && (
            <button
              onClick={() => {
                setFrom("");
                setTo("");
                setFilterEmployee("");
              }}
              className="rounded-lg border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100"
            >
              Limpiar
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-neutral-400">No hay jornadas que coincidan.</p>
        ) : (
          <>
            <div className="mb-2 flex justify-between text-xs text-neutral-500">
              <span>{visible.length} jornadas</span>
              <span className="font-medium">Total neto: {formatHours(totalNet)}</span>
            </div>
            <ul className="divide-y divide-neutral-100">
              {visible.map((s) => {
                const e = emp(s.employeeId);
                const open = isOpen(s);
                return (
                  <li
                    key={s.id}
                    className={`flex items-center gap-3 py-2 text-sm ${editingId === s.id ? "rounded-lg bg-brand-soft px-2" : ""}`}
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: e?.color ?? "#999" }} />
                    <span className="w-28 shrink-0 truncate font-medium">{e?.name ?? "—"}</span>
                    <span className="w-24 shrink-0 text-neutral-500">{s.date}</span>
                    <span className="w-28 shrink-0 text-neutral-500">
                      {open ? (
                        <span className="text-green-600">{s.start} · en curso</span>
                      ) : (
                        `${s.start}–${s.end}`
                      )}
                    </span>
                    <span className="w-16 shrink-0 text-xs text-neutral-400">
                      {s.breakMinutes ? `−${s.breakMinutes}m` : ""}
                    </span>
                    <span className="w-16 shrink-0 font-medium">
                      {open ? "—" : formatHours(sessionNetHours(s, rounding))}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-neutral-400">{s.note}</span>
                    <button onClick={() => startEdit(s.id)} className="shrink-0 rounded px-2 py-1 text-neutral-600 hover:bg-neutral-100">
                      Editar
                    </button>
                    <button onClick={() => removeSession(s.id)} className="shrink-0 rounded px-2 py-1 text-red-500 hover:bg-red-50">
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

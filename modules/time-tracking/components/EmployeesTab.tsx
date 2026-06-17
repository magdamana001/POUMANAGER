"use client";

import { useMemo, useState } from "react";
import { useConfig } from "@/core/config/ConfigProvider";
import { useTimeTracking } from "../store";
import type { Employee } from "../types";
import { formatMoney, todayISO } from "../utils";

const COLORS = ["#e11d48", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

export function EmployeesTab() {
  const { employees, addEmployee, updateEmployee, removeEmployee } = useTimeTracking();
  const { config } = useConfig();
  const currency = config.general.currency;
  const defaultContract =
    (config.modules["time-tracking"]?.settings?.defaultContractHours as number) ?? 40;

  const emptyForm = useMemo(
    () => ({
      name: "",
      position: "",
      phone: "",
      email: "",
      contractHours: defaultContract,
      extraHourPrice: 0,
      startDate: todayISO(),
      active: true,
      notes: "",
      color: COLORS[0],
    }),
    [defaultContract]
  );

  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    if (!form.name.trim()) return;
    if (editingId) updateEmployee(editingId, form);
    else addEmployee(form);
    setForm({ ...emptyForm });
    setEditingId(null);
  };

  const startEdit = (e: Employee) => {
    setEditingId(e.id);
    setForm({
      name: e.name,
      position: e.position,
      phone: e.phone ?? "",
      email: e.email ?? "",
      contractHours: e.contractHours,
      extraHourPrice: e.extraHourPrice,
      startDate: e.startDate || todayISO(),
      active: e.active ?? true,
      notes: e.notes ?? "",
      color: e.color,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filtered = useMemo(
    () =>
      employees.filter(
        (e) =>
          !search ||
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.position.toLowerCase().includes(search.toLowerCase())
      ),
    [employees, search]
  );

  const input =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Ficha */}
      <div className="lg:col-span-2">
        <div className={`rounded-xl border bg-white p-5 shadow-sm ${editingId ? "border-brand" : "border-neutral-200"}`}>
          <h2 className="mb-4 font-semibold">{editingId ? "Editar empleado" : "Nuevo empleado"}</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Nombre</label>
              <input className={input} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Nombre y apellidos" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Puesto</label>
              <input className={input} value={form.position} onChange={(e) => set({ position: e.target.value })} placeholder="Camarero, cocina..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Teléfono</label>
                <input className={input} value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <input className={input} value={form.email} onChange={(e) => set({ email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Horas/contrato (sem.)</label>
                <input type="number" min={0} className={input} value={form.contractHours} onChange={(e) => set({ contractHours: Number(e.target.value) })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Precio hora extra</label>
                <input type="number" min={0} step="0.01" className={input} value={form.extraHourPrice} onChange={(e) => set({ extraHourPrice: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Fecha de alta</label>
                <input type="date" className={input} value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Estado</label>
                <button
                  type="button"
                  onClick={() => set({ active: !form.active })}
                  className={`flex h-[38px] w-full items-center justify-center rounded-lg text-sm font-medium ${
                    form.active ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {form.active ? "Activo" : "Inactivo"}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Notas</label>
              <textarea className={input} rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Color</label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set({ color: c })}
                    style={{ backgroundColor: c }}
                    className={`h-7 w-7 rounded-full transition ${form.color === c ? "ring-2 ring-offset-2 ring-neutral-400" : ""}`}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={submit} className="flex-1 rounded-lg bg-brand py-2 font-medium text-white hover:opacity-90">
                {editingId ? "Guardar cambios" : "Añadir empleado"}
              </button>
              {editingId && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setForm({ ...emptyForm });
                  }}
                  className="rounded-lg border border-neutral-300 px-4 hover:bg-neutral-100"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Listado */}
      <div className="lg:col-span-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Empleados ({employees.length})</h2>
            <input
              className="w-44 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-brand focus:outline-none"
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-neutral-400">Sin resultados.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((e) => (
                <li key={e.id} className={`flex items-center gap-3 rounded-lg border p-3 ${e.active ? "border-neutral-100 bg-neutral-50" : "border-neutral-100 bg-neutral-100/60 opacity-70"}`}>
                  <span className="h-9 w-9 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-medium">
                      {e.name}
                      {!e.active && <span className="rounded bg-neutral-300 px-1.5 text-[10px] text-neutral-700">inactivo</span>}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {e.position || "—"} · {e.contractHours}h/sem · extra {formatMoney(e.extraHourPrice, currency)}
                      {e.phone ? ` · ${e.phone}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => updateEmployee(e.id, { active: !e.active })}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-200"
                  >
                    {e.active ? "Desactivar" : "Activar"}
                  </button>
                  <button onClick={() => startEdit(e)} className="shrink-0 rounded-lg px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-200">
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar a ${e.name}? Se borran también sus jornadas.`)) removeEmployee(e.id);
                    }}
                    className="shrink-0 rounded-lg px-2 py-1 text-sm text-red-500 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useConfig } from "@/core/config/ConfigProvider";
import { useTimeTracking } from "../store";
import type { Employee } from "../types";
import { formatMoney } from "../utils";

const COLORS = ["#e11d48", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

const EMPTY_FORM = {
  name: "",
  position: "",
  contractHours: 40,
  extraHourPrice: 0,
  color: COLORS[0],
};

export function EmployeesTab() {
  const { employees, addEmployee, updateEmployee, removeEmployee } = useTimeTracking();
  const { config } = useConfig();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);

  const currency = config.general.currency;

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateEmployee(editingId, form);
    } else {
      addEmployee(form);
    }
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
  };

  const startEdit = (e: Employee) => {
    setEditingId(e.id);
    setForm({
      name: e.name,
      position: e.position,
      contractHours: e.contractHours,
      extraHourPrice: e.extraHourPrice,
      color: e.color,
    });
  };

  const input =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Formulario ficha */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">
            {editingId ? "Editar empleado" : "Nuevo empleado"}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Nombre</label>
              <input
                className={input}
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Nombre y apellidos"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Puesto</label>
              <input
                className={input}
                value={form.position}
                onChange={(e) => set({ position: e.target.value })}
                placeholder="Camarero, cocina..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Horas/contrato (sem.)</label>
                <input
                  type="number"
                  min={0}
                  className={input}
                  value={form.contractHours}
                  onChange={(e) => set({ contractHours: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Precio hora extra</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={input}
                  value={form.extraHourPrice}
                  onChange={(e) => set({ extraHourPrice: Number(e.target.value) })}
                />
              </div>
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
                    className={`h-7 w-7 rounded-full transition ${
                      form.color === c ? "ring-2 ring-offset-2 ring-neutral-400" : ""
                    }`}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={submit}
                className="flex-1 rounded-lg bg-brand py-2 font-medium text-white hover:opacity-90"
              >
                {editingId ? "Guardar cambios" : "Añadir empleado"}
              </button>
              {editingId && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setForm({ ...EMPTY_FORM });
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
          <h2 className="mb-4 font-semibold">Empleados ({employees.length})</h2>
          {employees.length === 0 ? (
            <p className="text-sm text-neutral-400">Aún no hay empleados. Añade el primero.</p>
          ) : (
            <ul className="space-y-2">
              {employees.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 p-3"
                >
                  <span
                    className="h-9 w-9 shrink-0 rounded-full"
                    style={{ backgroundColor: e.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.name}</p>
                    <p className="truncate text-xs text-neutral-500">
                      {e.position || "—"} · {e.contractHours}h/sem · extra{" "}
                      {formatMoney(e.extraHourPrice, currency)}
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(e)}
                    className="rounded-lg px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-200"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar a ${e.name}? Se borran también sus jornadas.`))
                        removeEmployee(e.id);
                    }}
                    className="rounded-lg px-2 py-1 text-sm text-red-500 hover:bg-red-50"
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

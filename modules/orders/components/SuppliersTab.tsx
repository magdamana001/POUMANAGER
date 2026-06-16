"use client";

import { useState } from "react";
import { useOrders } from "../store";
import type { Supplier } from "../types";
import { WEEKDAYS_SHORT } from "../utils";

const COLORS = ["#e11d48", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

const EMPTY = {
  name: "",
  phone: "",
  visitDays: [] as number[],
  leadDays: 1,
  color: COLORS[0],
};

export function SuppliersTab() {
  const { suppliers, products, addSupplier, updateSupplier, removeSupplier } = useOrders();
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const toggleDay = (i: number) =>
    set({
      visitDays: form.visitDays.includes(i)
        ? form.visitDays.filter((d) => d !== i)
        : [...form.visitDays, i].sort(),
    });

  const submit = () => {
    if (!form.name.trim()) return;
    if (editingId) updateSupplier(editingId, form);
    else addSupplier(form);
    setForm({ ...EMPTY });
    setEditingId(null);
  };

  const startEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      phone: s.phone,
      visitDays: s.visitDays,
      leadDays: s.leadDays,
      color: s.color,
    });
  };

  const input =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";
  const countProducts = (id: string) => products.filter((p) => p.supplierId === id).length;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">
            {editingId ? "Editar proveedor" : "Nuevo proveedor"}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Nombre</label>
              <input className={input} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Distribuciones..." />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Teléfono</label>
              <input className={input} value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+34..." />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Días que vienen a tomar pedido</label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS_SHORT.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`rounded-lg px-2.5 py-1.5 text-sm transition ${
                      form.visitDays.includes(i)
                        ? "bg-brand text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Días hasta recibir (tras enviar)</label>
              <input
                type="number"
                min={0}
                className={input}
                value={form.leadDays}
                onChange={(e) => set({ leadDays: Number(e.target.value) })}
              />
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
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={submit} className="flex-1 rounded-lg bg-brand py-2 font-medium text-white hover:opacity-90">
                {editingId ? "Guardar" : "Añadir proveedor"}
              </button>
              {editingId && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setForm({ ...EMPTY });
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

      <div className="lg:col-span-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">Proveedores ({suppliers.length})</h2>
          {suppliers.length === 0 ? (
            <p className="text-sm text-neutral-400">Añade tu primer proveedor.</p>
          ) : (
            <ul className="space-y-2">
              {suppliers.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                  <span className="h-9 w-9 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="truncate text-xs text-neutral-500">
                      {s.visitDays.length
                        ? s.visitDays.map((d) => WEEKDAYS_SHORT[d]).join(", ")
                        : "Sin días"}{" "}
                      · {countProducts(s.id)} productos · recibe en {s.leadDays}d
                    </p>
                  </div>
                  <button onClick={() => startEdit(s)} className="rounded-lg px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-200">
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar ${s.name}? Se borran sus productos y pedidos.`))
                        removeSupplier(s.id);
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

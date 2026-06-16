"use client";

import { useState } from "react";
import { useOrders } from "../store";

const UNITS = ["ud", "caja", "kg", "L", "botella", "barril", "paquete"];

export function ProductsTab() {
  const { suppliers, products, addProduct, updateProduct, removeProduct } = useOrders();
  const [form, setForm] = useState({ name: "", supplierId: "", unit: "ud" });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    const supplierId = form.supplierId || suppliers[0]?.id;
    if (!form.name.trim() || !supplierId) return;
    addProduct({ name: form.name.trim(), supplierId, unit: form.unit });
    setForm((f) => ({ ...f, name: "" }));
  };

  const input =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";

  if (suppliers.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        Primero crea proveedores en la pestaña «Proveedores».
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Nuevo producto</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-sm font-medium">Nombre</label>
            <input
              className={input}
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Ej: Cerveza 33cl"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Proveedor</label>
            <select className={input} value={form.supplierId || suppliers[0]?.id} onChange={(e) => set({ supplierId: e.target.value })}>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Unidad</label>
            <select className={input} value={form.unit} onChange={(e) => set({ unit: e.target.value })}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={submit} className="mt-4 rounded-lg bg-brand px-5 py-2 font-medium text-white hover:opacity-90">
          Añadir producto
        </button>
      </div>

      {/* Agrupado por proveedor */}
      <div className="space-y-4">
        {suppliers.map((s) => {
          const items = products.filter((p) => p.supplierId === s.id);
          return (
            <div key={s.id} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                <h3 className="font-semibold">{s.name}</h3>
                <span className="text-sm text-neutral-400">({items.length})</span>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-neutral-400">Sin productos.</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {items.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <select
                        className="rounded border border-neutral-200 px-1 py-0.5 text-xs"
                        value={p.unit}
                        onChange={(e) => updateProduct(p.id, { unit: e.target.value })}
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => removeProduct(p.id)} className="text-neutral-400 hover:text-red-500">
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

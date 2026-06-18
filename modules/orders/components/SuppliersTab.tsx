"use client";

import { useMemo, useRef, useState } from "react";
import { useOrders } from "../store";
import type { Supplier } from "../types";
import { SupplierAvatar, inputCls } from "./ui";
import { WEEKDAYS_SHORT } from "../utils";
import { fileToDataUrl, makeSquareIcon, prepareForUpload } from "@/core/ai/image";
import { generateThumbnail } from "@/core/ai/client";

const COLORS = [
  "#e11d48", "#f97316", "#d97706", "#ca8a04", "#16a34a", "#0d9488",
  "#0891b2", "#2563eb", "#4f46e5", "#7c3aed", "#c026d3", "#475569",
];

interface FormState {
  name: string;
  phone: string;
  email: string;
  visitDays: number[];
  leadDays: number;
  notes: string;
  logo?: string;
  color: string;
}

const EMPTY: FormState = {
  name: "",
  phone: "",
  email: "",
  visitDays: [],
  leadDays: 1,
  notes: "",
  color: COLORS[0],
};

export function SuppliersTab() {
  const { suppliers, products, addSupplier, updateSupplier, removeSupplier } = useOrders();
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

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
    setGenError(null);
  };

  const startEdit = (s: Supplier) => {
    setEditingId(s.id);
    setGenError(null);
    setForm({
      name: s.name,
      phone: s.phone,
      email: s.email ?? "",
      visitDays: s.visitDays,
      leadDays: s.leadDays,
      notes: s.notes ?? "",
      logo: s.logo,
      color: s.color,
    });
  };

  const reset = () => {
    setEditingId(null);
    setForm({ ...EMPTY });
    setGenError(null);
  };

  // Contexto para el logo: productos que suministra el proveedor en edición.
  const supplierContext = useMemo(() => {
    if (!editingId) return "";
    const items = products.filter((p) => p.supplierId === editingId);
    const terms = Array.from(new Set(items.map((p) => p.category || p.name))).slice(0, 8);
    return terms.join(", ");
  }, [products, editingId]);

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setGenError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      set({ logo: await makeSquareIcon(dataUrl, 128) });
    } catch {
      setGenError("No se pudo cargar la imagen.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const generateLogo = async () => {
    if (!form.name.trim()) {
      setGenError("Escribe primero el nombre del proveedor.");
      return;
    }
    setGenLoading(true);
    setGenError(null);
    try {
      const dataUrl = await generateThumbnail({ name: form.name, mode: "logo", context: supplierContext });
      set({ logo: await makeSquareIcon(dataUrl, 128) });
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Error al generar el logo");
    } finally {
      setGenLoading(false);
    }
  };

  const countProducts = (id: string) => products.filter((p) => p.supplierId === id).length;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Formulario */}
      <div className="lg:col-span-2">
        <div className={`rounded-2xl border bg-white p-5 shadow-sm ${editingId ? "border-brand/40" : "border-neutral-200"}`}>
          <h2 className="mb-4 font-semibold">{editingId ? "Editar proveedor" : "Nuevo proveedor"}</h2>

          {/* Logo */}
          <div className="mb-4 flex items-center gap-4">
            <SupplierAvatar name={form.name || "?"} color={form.color} logo={form.logo} size={72} />
            <div className="flex flex-col gap-1.5">
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
              <div className="flex gap-1.5">
                <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100">📷 Foto</button>
                <button type="button" onClick={generateLogo} disabled={genLoading} className="rounded-lg bg-brand px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50">
                  {genLoading ? "Generando…" : "✨ Logo IA"}
                </button>
                {form.logo && <button type="button" onClick={() => set({ logo: undefined })} className="rounded-lg px-2 py-1 text-xs text-neutral-400 hover:text-red-500">Quitar</button>}
              </div>
              <p className="text-[11px] text-neutral-400">Logo a partir del nombre y sus productos.</p>
              {genError && <p className="text-[11px] text-red-600">{genError}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Nombre</label>
              <input className={inputCls} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Distribuciones..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Teléfono</label>
                <input className={inputCls} value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+34..." />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Email</label>
                <input className={inputCls} value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="pedidos@..." />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-neutral-500">Días que vienen a tomar pedido</label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS_SHORT.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`rounded-lg px-2.5 py-1.5 text-sm transition ${
                      form.visitDays.includes(i) ? "bg-brand text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Días hasta recibir (tras enviar)</label>
              <input type="number" min={0} className={inputCls} value={form.leadDays} onChange={(e) => set({ leadDays: Number(e.target.value) })} />
            </div>

            {/* Color */}
            <div>
              <label className="mb-2 block text-xs font-medium text-neutral-500">Color identificativo</label>
              <div className="flex flex-wrap items-center gap-2">
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
                <label className="ml-1 flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2 py-1 text-xs text-neutral-500">
                  <input type="color" value={form.color} onChange={(e) => set({ color: e.target.value })} className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0" />
                  Personalizado
                </label>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Notas</label>
              <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Pedido mínimo, condiciones..." />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={submit} className="flex-1 rounded-xl bg-brand py-2.5 font-medium text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]">
                {editingId ? "Guardar cambios" : "Añadir proveedor"}
              </button>
              {editingId && <button onClick={reset} className="rounded-xl border border-neutral-300 px-4 hover:bg-neutral-100">Cancelar</button>}
            </div>
          </div>
        </div>
      </div>

      {/* Listado */}
      <div className="lg:col-span-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">Proveedores ({suppliers.length})</h2>
          {suppliers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-400">Añade tu primer proveedor.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {suppliers.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                  <SupplierAvatar name={s.name} color={s.color} logo={s.logo} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="truncate text-xs text-neutral-500">
                      {s.visitDays.length ? s.visitDays.map((d) => WEEKDAYS_SHORT[d]).join(", ") : "Sin días"} · {countProducts(s.id)} productos
                    </p>
                  </div>
                  <button onClick={() => startEdit(s)} className="shrink-0 rounded-lg px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-200">Editar</button>
                  <button
                    onClick={() => confirm(`¿Eliminar ${s.name}? Se borran sus productos y pedidos.`) && removeSupplier(s.id)}
                    className="shrink-0 rounded-lg px-2 py-1 text-sm text-red-500 hover:bg-red-50"
                  >
                    ✕
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

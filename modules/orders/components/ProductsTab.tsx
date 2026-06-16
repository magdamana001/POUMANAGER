"use client";

import { useRef, useState } from "react";
import { useOrders } from "../store";
import { ProductIcon } from "./ProductIcon";
import { fileToDataUrl, makeSquareIcon, prepareForUpload } from "@/core/ai/image";
import { generateThumbnail } from "@/core/ai/client";

const UNITS = ["ud", "caja", "kg", "L", "botella", "barril", "paquete"];

interface EditForm {
  name: string;
  supplierId: string;
  unit: string;
  icon?: string;
}

export function ProductsTab() {
  const { suppliers, products, addProduct, updateProduct, removeProduct } = useOrders();
  const [form, setForm] = useState({ name: "", supplierId: "", unit: "ud" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", supplierId: "", unit: "ud" });
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const setEdit = (patch: Partial<EditForm>) => setEditForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    const supplierId = form.supplierId || suppliers[0]?.id;
    if (!form.name.trim() || !supplierId) return;
    addProduct({ name: form.name.trim(), supplierId, unit: form.unit });
    setForm((f) => ({ ...f, name: "" }));
  };

  const startEdit = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setEditingId(id);
    setGenError(null);
    setEditForm({ name: p.name, supplierId: p.supplierId, unit: p.unit, icon: p.icon });
  };

  const saveEdit = () => {
    if (!editingId || !editForm.name.trim()) return;
    updateProduct(editingId, {
      name: editForm.name.trim(),
      supplierId: editForm.supplierId,
      unit: editForm.unit,
      icon: editForm.icon,
    });
    setEditingId(null);
  };

  // Sube una foto y la usa como icono (recortada cuadrada).
  const onEditPhoto = async (file: File | undefined) => {
    if (!file) return;
    setGenError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setEdit({ icon: await makeSquareIcon(dataUrl, 128) });
    } catch {
      setGenError("No se pudo cargar la imagen.");
    }
    if (editFileRef.current) editFileRef.current.value = "";
  };

  // Reconvierte la imagen (o el nombre) en una miniatura profesional con IA.
  const generateEditThumbnail = async () => {
    setGenLoading(true);
    setGenError(null);
    try {
      let imageBase64: string | undefined;
      let mimeType: string | undefined;
      if (editForm.icon && editForm.icon.startsWith("data:")) {
        const prepared = await prepareForUpload(editForm.icon);
        imageBase64 = prepared.base64;
        mimeType = prepared.mimeType;
      }
      const generated = await generateThumbnail({ imageBase64, mimeType, name: editForm.name });
      setEdit({ icon: await makeSquareIcon(generated, 128) });
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Error al generar la miniatura");
    } finally {
      setGenLoading(false);
    }
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
                  {items.map((p) =>
                    editingId === p.id ? (
                      <li
                        key={p.id}
                        className="flex flex-col gap-2 rounded-lg border border-brand bg-brand-soft p-3 text-sm sm:col-span-2"
                      >
                        <div className="grid gap-2 sm:grid-cols-4">
                          <input
                            className="sm:col-span-2 rounded border border-neutral-300 px-2 py-1.5 focus:border-brand focus:outline-none"
                            value={editForm.name}
                            onChange={(e) => setEdit({ name: e.target.value })}
                            placeholder="Nombre"
                          />
                          <select
                            className="rounded border border-neutral-300 px-2 py-1.5"
                            value={editForm.supplierId}
                            onChange={(e) => setEdit({ supplierId: e.target.value })}
                          >
                            {suppliers.map((sp) => (
                              <option key={sp.id} value={sp.id}>
                                {sp.name}
                              </option>
                            ))}
                          </select>
                          <select
                            className="rounded border border-neutral-300 px-2 py-1.5"
                            value={editForm.unit}
                            onChange={(e) => setEdit({ unit: e.target.value })}
                          >
                            {UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Icono / miniatura con IA */}
                        <div className="flex flex-wrap items-center gap-2 border-t border-white/60 pt-2">
                          <ProductIcon icon={editForm.icon} size={44} />
                          <input
                            ref={editFileRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => onEditPhoto(e.target.files?.[0])}
                          />
                          <button
                            type="button"
                            onClick={() => editFileRef.current?.click()}
                            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs hover:bg-neutral-100"
                          >
                            📷 Foto
                          </button>
                          <button
                            type="button"
                            onClick={generateEditThumbnail}
                            disabled={genLoading}
                            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                          >
                            {genLoading ? "Generando…" : "✨ Miniatura con IA"}
                          </button>
                          {editForm.icon && (
                            <button
                              type="button"
                              onClick={() => setEdit({ icon: undefined })}
                              className="rounded-lg px-2 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100"
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                        {genError && (
                          <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{genError}</p>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-neutral-300 px-4 py-1.5 text-sm hover:bg-white"
                          >
                            Cancelar
                          </button>
                        </div>
                      </li>
                    ) : (
                      <li key={p.id} className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                        <ProductIcon icon={p.icon} />
                        <span className="min-w-0 flex-1 truncate">{p.name}</span>
                        <span className="shrink-0 rounded bg-neutral-200 px-1.5 py-0.5 text-xs text-neutral-600">
                          {p.unit}
                        </span>
                        <button
                          onClick={() => startEdit(p.id)}
                          className="shrink-0 rounded px-2 py-0.5 text-neutral-600 hover:bg-neutral-200"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => removeProduct(p.id)}
                          className="shrink-0 text-neutral-400 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

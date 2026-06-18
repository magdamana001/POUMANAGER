"use client";

import { useMemo, useRef, useState } from "react";
import { useConfig } from "@/core/config/ConfigProvider";
import { useOrders } from "../store";
import { useStockControl } from "../hooks";
import { ProductIcon } from "./ProductIcon";
import { SupplierAvatar, Stepper, inputCls } from "./ui";
import { formatMoney, isLowStock } from "../utils";
import { fileToDataUrl, makeSquareIcon, prepareForUpload } from "@/core/ai/image";
import { generateThumbnail } from "@/core/ai/client";

const UNITS = ["ud", "caja", "kg", "L", "botella", "barril", "paquete"];

export function ProductsTab() {
  const { suppliers, products, removeProduct, removeProducts, adjustStock } = useOrders();
  const { config } = useConfig();
  const currency = config.general.currency;
  const stockOn = useStockControl();

  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [panel, setPanel] = useState<{ editingId: string | null } | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[],
    [products]
  );
  const lowCount = useMemo(() => products.filter(isLowStock).length, [products]);

  const matches = (id: string) =>
    products
      .filter((p) => p.supplierId === id)
      .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.category ?? "").toLowerCase().includes(search.toLowerCase()))
      .filter((p) => !categoryFilter || p.category === categoryFilter)
      .filter((p) => !stockOn || !onlyLow || isLowStock(p));

  const visibleSuppliers = suppliers.filter((s) => !supplierFilter || s.id === supplierFilter);
  const allVisibleIds = useMemo(
    () => visibleSuppliers.flatMap((s) => matches(s.id).map((p) => p.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleSuppliers, products, search, categoryFilter, onlyLow, stockOn]
  );

  const toggleSel = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const exitSelect = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const bulkDelete = () => {
    if (selected.size === 0) return;
    if (confirm(`¿Eliminar ${selected.size} productos? Esta acción no se puede deshacer.`)) {
      removeProducts(Array.from(selected));
      exitSelect();
    }
  };

  const select = "rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none";

  if (suppliers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-sm text-neutral-400">
        Primero crea proveedores en la pestaña «Proveedores».
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          onClick={() => setPanel({ editingId: null })}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-medium text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
        >
          <span className="text-lg leading-none">＋</span> Nuevo producto
        </button>
        <div className="relative flex-1 sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">🔍</span>
          <input
            className="w-full rounded-xl border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand focus:outline-none"
            placeholder="Buscar producto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={select} value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
          <option value="">Todos los proveedores</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {categories.length > 0 && (
          <select className={select} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        {stockOn && (
          <button
            onClick={() => setOnlyLow((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
              onlyLow ? "border-red-300 bg-red-50 text-red-700" : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            Bajo mínimo
            {lowCount > 0 && <span className="rounded-full bg-red-100 px-1.5 text-xs font-semibold text-red-700">{lowCount}</span>}
          </button>
        )}
        <button
          onClick={() => (selecting ? exitSelect() : setSelecting(true))}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition sm:ml-auto ${
            selecting ? "border-brand bg-brand-soft text-brand" : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          {selecting ? "Cancelar selección" : "☑ Seleccionar"}
        </button>
      </div>

      {/* Panel de alta / edición */}
      {panel && <ProductForm editingId={panel.editingId} stockOn={stockOn} onClose={() => setPanel(null)} />}

      {/* Catálogo por proveedor */}
      <div className="space-y-5">
        {visibleSuppliers.map((s) => {
          const items = matches(s.id);
          if (items.length === 0 && (search || onlyLow || categoryFilter)) return null;
          const stockValue = items.reduce((a, p) => a + (p.stock ?? 0) * (p.price ?? 0), 0);
          return (
            <section key={s.id}>
              <div className="mb-3 flex items-center gap-3">
                <SupplierAvatar name={s.name} color={s.color} logo={s.logo} size={32} />
                <h3 className="font-semibold">{s.name}</h3>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">{items.length} productos</span>
                {stockOn && stockValue > 0 && (
                  <span className="ml-auto text-xs text-neutral-400">Valor stock: {formatMoney(stockValue, currency)}</span>
                )}
              </div>
              {items.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-400">Sin productos para este proveedor.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((p) => {
                    const sel = selected.has(p.id);
                    return (
                      <article
                        key={p.id}
                        onClick={() => selecting && toggleSel(p.id)}
                        className={`flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition ${
                          selecting ? "cursor-pointer" : "hover:shadow-md"
                        } ${sel ? "border-brand ring-2 ring-brand/30" : isLowStock(p) && stockOn ? "border-red-200" : "border-neutral-200"}`}
                      >
                        <div className="flex items-start gap-3">
                          {selecting && (
                            <input type="checkbox" readOnly checked={sel} className="mt-1 h-4 w-4 accent-brand" />
                          )}
                          <ProductIcon icon={p.icon} size={48} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold leading-tight">{p.name}</p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-400">
                              {p.category && <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-500">{p.category}</span>}
                              <span>{p.unit}</span>
                            </p>
                          </div>
                          <p className="shrink-0 text-right text-sm font-bold">
                            {p.price ? formatMoney(p.price, currency) : <span className="text-neutral-300">sin precio</span>}
                          </p>
                        </div>

                        {stockOn && (
                          <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2">
                            <div className="text-xs">
                              <span className="text-neutral-400">Stock </span>
                              <span className={`font-semibold ${isLowStock(p) ? "text-red-600" : "text-neutral-700"}`}>{p.stock ?? 0}</span>
                              {(p.minStock ?? 0) > 0 && <span className="text-neutral-400"> · mín {p.minStock}</span>}
                              {isLowStock(p) && <span className="ml-1 rounded bg-red-100 px-1.5 text-[10px] font-medium text-red-700">bajo</span>}
                            </div>
                            {!selecting && <Stepper value={p.stock ?? 0} onChange={(v) => adjustStock(p.id, v - (p.stock ?? 0))} />}
                          </div>
                        )}

                        {!selecting && (
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => setPanel({ editingId: p.id })} className="flex-1 rounded-xl border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100">✏️ Editar</button>
                            <button onClick={() => confirm(`¿Eliminar ${p.name}?`) && removeProduct(p.id)} className="rounded-xl px-3 py-1.5 text-sm text-red-500 hover:bg-red-50">🗑</button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Barra de selección masiva */}
      {selecting && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
            <span className="mr-auto text-sm text-neutral-600">{selected.size} seleccionados</span>
            <button
              onClick={() => setSelected((prev) => (prev.size === allVisibleIds.length ? new Set() : new Set(allVisibleIds)))}
              className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-100"
            >
              {selected.size === allVisibleIds.length && allVisibleIds.length > 0 ? "Quitar todo" : "Seleccionar todo"}
            </button>
            <button onClick={exitSelect} className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-100">Cancelar</button>
            <button onClick={bulkDelete} disabled={selected.size === 0} className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-40">
              🗑 Eliminar ({selected.size})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface FormState {
  name: string;
  supplierId: string;
  unit: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  icon?: string;
}

/** Panel unificado para crear o editar un producto, con miniatura IA. */
function ProductForm({ editingId, stockOn, onClose }: { editingId: string | null; stockOn: boolean; onClose: () => void }) {
  const { suppliers, products, addProduct, updateProduct } = useOrders();
  const { config } = useConfig();
  const currency = config.general.currency;
  const editing = editingId ? products.find((p) => p.id === editingId) : undefined;

  const [form, setForm] = useState<FormState>(() => ({
    name: editing?.name ?? "",
    supplierId: editing?.supplierId ?? suppliers[0]?.id ?? "",
    unit: editing?.unit ?? "ud",
    category: editing?.category ?? "",
    price: editing?.price ?? 0,
    stock: editing?.stock ?? 0,
    minStock: editing?.minStock ?? 0,
    icon: editing?.icon,
  }));
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const save = () => {
    if (!form.name.trim() || !form.supplierId) return;
    const payload = {
      name: form.name.trim(),
      supplierId: form.supplierId,
      unit: form.unit,
      category: form.category.trim() || undefined,
      price: form.price || 0,
      stock: form.stock || 0,
      minStock: form.minStock || 0,
      icon: form.icon,
    };
    if (editingId) updateProduct(editingId, payload);
    else addProduct(payload);
    onClose();
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setGenError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      set({ icon: await makeSquareIcon(dataUrl, 128) });
    } catch {
      setGenError("No se pudo cargar la imagen.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const generate = async () => {
    setGenLoading(true);
    setGenError(null);
    try {
      let imageBase64: string | undefined;
      let mimeType: string | undefined;
      if (form.icon && form.icon.startsWith("data:")) {
        const prepared = await prepareForUpload(form.icon);
        imageBase64 = prepared.base64;
        mimeType = prepared.mimeType;
      }
      const generated = await generateThumbnail({ imageBase64, mimeType, name: form.name });
      set({ icon: await makeSquareIcon(generated, 128) });
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Error al generar la miniatura");
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-brand/40 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{editingId ? "Editar producto" : "Nuevo producto"}</h2>
        <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-neutral-400 hover:bg-neutral-100">✕</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-2">
          <ProductIcon icon={form.icon} size={96} />
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
          <div className="flex gap-1.5">
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100">📷 Foto</button>
            <button type="button" onClick={generate} disabled={genLoading} className="rounded-lg bg-brand px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50">{genLoading ? "…" : "✨ IA"}</button>
          </div>
          {form.icon && <button type="button" onClick={() => set({ icon: undefined })} className="text-xs text-neutral-400 hover:text-red-500">Quitar</button>}
          {genError && <p className="max-w-[140px] text-center text-[11px] text-red-600">{genError}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-neutral-500">Nombre</label>
            <input className={inputCls} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej: Cerveza 33cl" autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Proveedor</label>
            <select className={inputCls} value={form.supplierId} onChange={(e) => set({ supplierId: e.target.value })}>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Categoría</label>
            <input className={inputCls} value={form.category} onChange={(e) => set({ category: e.target.value })} placeholder="Bebidas, limpieza…" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Unidad</label>
            <select className={inputCls} value={form.unit} onChange={(e) => set({ unit: e.target.value })}>
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Precio ({currency})</label>
            <input type="number" min={0} step="0.01" className={inputCls} value={form.price} onChange={(e) => set({ price: Number(e.target.value) })} />
          </div>
          {stockOn && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Stock actual</label>
                <input type="number" min={0} className={inputCls} value={form.stock} onChange={(e) => set({ stock: Number(e.target.value) })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Punto de pedido</label>
                <input type="number" min={0} className={inputCls} value={form.minStock} onChange={(e) => set({ minStock: Number(e.target.value) })} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100">Cancelar</button>
        <button onClick={save} className="rounded-xl bg-brand px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]">
          {editingId ? "Guardar cambios" : "Añadir producto"}
        </button>
      </div>
    </div>
  );
}

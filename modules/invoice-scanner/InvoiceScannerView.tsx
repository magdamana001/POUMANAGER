"use client";

import { useMemo, useRef, useState } from "react";
import { useConfig } from "@/core/config/ConfigProvider";
import { useOrders } from "@/modules/orders/store";
import { useStockControl } from "@/modules/orders/hooks";
import { SupplierAvatar, inputCls } from "@/modules/orders/components/ui";
import { formatMoney } from "@/modules/orders/utils";
import { fileToDataUrl, prepareForUpload } from "@/core/ai/image";
import { scanInvoice } from "@/core/ai/client";

const UNITS = ["ud", "caja", "kg", "L", "botella", "barril", "paquete"];

interface Row {
  id: string;
  include: boolean;
  name: string;
  qty: number;
  unit: string;
  price: number;
}

type Phase = "idle" | "analyzing" | "ready";

export function InvoiceScannerView() {
  const { config } = useConfig();
  const currency = config.general.currency;
  const { suppliers, products, addProduct, updateProduct, adjustStock } = useOrders();
  const stockOn = useStockControl();

  const fileRef = useRef<HTMLInputElement>(null);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [photo, setPhoto] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<{ supplier?: string; date?: string }>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  const supplierProducts = useMemo(
    () => products.filter((p) => p.supplierId === supplierId),
    [products, supplierId]
  );
  const findExisting = (name: string) =>
    supplierProducts.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());

  const setRow = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setSummary(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPhoto(dataUrl);
      setPhase("analyzing");
      const { base64, mimeType } = await prepareForUpload(dataUrl, 1280);
      const scan = await scanInvoice(base64, mimeType);
      setDetected({ supplier: scan.supplier, date: scan.date });
      setRows(
        scan.lines.map((l, i) => ({
          id: `${Date.now()}-${i}`,
          include: true,
          name: l.name,
          qty: l.qty,
          unit: l.unit,
          price: l.price,
        }))
      );
      setPhase("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
      setPhase(photo ? "ready" : "idle");
    }
  };

  const apply = () => {
    if (!supplierId) return;
    let created = 0;
    let updated = 0;
    rows
      .filter((r) => r.include && r.name.trim())
      .forEach((r) => {
        const existing = findExisting(r.name);
        if (existing) {
          updateProduct(existing.id, { price: r.price || existing.price, unit: r.unit });
          if (stockOn && r.qty > 0) adjustStock(existing.id, r.qty);
          updated++;
        } else {
          addProduct({
            name: r.name.trim(),
            supplierId,
            unit: r.unit || "ud",
            price: r.price || 0,
            stock: stockOn ? r.qty || 0 : 0,
            minStock: 0,
          });
          created++;
        }
      });
    setSummary(
      `${created} productos nuevos · ${updated} actualizados${stockOn ? " (stock sumado)" : ""}.`
    );
    setRows([]);
    setPhoto(null);
    setPhase("idle");
    if (fileRef.current) fileRef.current.value = "";
  };

  const includedCount = rows.filter((r) => r.include).length;
  const includedTotal = rows
    .filter((r) => r.include)
    .reduce((a, r) => a + r.qty * r.price, 0);

  if (suppliers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-sm text-neutral-400">
        Crea al menos un proveedor en «Pedidos → Proveedores» para escanear sus albaranes.
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
        Módulo experimental. La IA lee el albarán; revisa siempre los datos antes de guardar.
      </div>

      {summary && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">✓ {summary}</div>
      )}

      {/* Proveedor + captura */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-neutral-500">Proveedor destino</label>
            <select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {detected.supplier && (
              <p className="mt-1 text-xs text-neutral-400">Detectado en el albarán: {detected.supplier}{detected.date ? ` · ${detected.date}` : ""}</p>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-medium text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
          >
            📷 {photo ? "Escanear otro" : "Escanear albarán"}
          </button>
        </div>

        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="albarán" className="mt-4 max-h-56 rounded-xl border border-neutral-200 object-contain" />
        )}
      </div>

      {phase === "analyzing" && <p className="text-center text-sm text-neutral-500">Leyendo el albarán con IA…</p>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {/* Resultado editable */}
      {phase === "ready" && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <SupplierAvatar name={suppliers.find((s) => s.id === supplierId)?.name ?? "?"} color={suppliers.find((s) => s.id === supplierId)?.color} logo={suppliers.find((s) => s.id === supplierId)?.logo} size={28} />
            <h3 className="font-semibold">Líneas detectadas ({rows.length})</h3>
            <button
              onClick={() => setRows((rs) => [...rs, { id: `${Date.now()}`, include: true, name: "", qty: 1, unit: "ud", price: 0 }])}
              className="ml-auto rounded-lg border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100"
            >
              ＋ Añadir línea
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-400">
              No se detectaron líneas. Añade alguna a mano o prueba con otra foto más nítida.
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => {
                const existing = findExisting(r.name);
                return (
                  <li key={r.id} className={`rounded-xl border p-3 ${r.include ? "border-neutral-200" : "border-neutral-100 bg-neutral-50 opacity-60"}`}>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={r.include} onChange={(e) => setRow(r.id, { include: e.target.checked })} className="h-4 w-4 accent-brand" />
                      <input className={`${inputCls} flex-1`} value={r.name} onChange={(e) => setRow(r.id, { name: e.target.value })} placeholder="Nombre del producto" />
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${existing ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                        {existing ? "actualiza" : "nuevo"}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      <label className="text-xs text-neutral-500">
                        Cantidad
                        <input type="number" min={0} step="0.01" className={`${inputCls} mt-0.5`} value={r.qty} onChange={(e) => setRow(r.id, { qty: Number(e.target.value) })} />
                      </label>
                      <label className="text-xs text-neutral-500">
                        Unidad
                        <select className={`${inputCls} mt-0.5`} value={r.unit} onChange={(e) => setRow(r.id, { unit: e.target.value })}>
                          {UNITS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-neutral-500">
                        Precio/ud
                        <input type="number" min={0} step="0.01" className={`${inputCls} mt-0.5`} value={r.price} onChange={(e) => setRow(r.id, { price: Number(e.target.value) })} />
                      </label>
                      <div className="flex items-end justify-between text-xs text-neutral-500 sm:flex-col sm:items-end">
                        <span className="font-medium text-neutral-700">{formatMoney(r.qty * r.price, currency)}</span>
                        <button onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} className="text-red-500 hover:underline">quitar</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Barra de acción fija */}
      {phase === "ready" && rows.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-neutral-400">{includedCount} líneas seleccionadas</p>
              <p className="text-lg font-bold leading-tight">{formatMoney(includedTotal, currency)}</p>
            </div>
            <button onClick={apply} disabled={includedCount === 0} className="rounded-xl bg-brand px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-40 active:scale-[0.98]">
              Añadir al catálogo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

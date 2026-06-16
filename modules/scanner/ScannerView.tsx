"use client";

import { useRef, useState } from "react";
import { useOrders } from "@/modules/orders/store";
import { ProductIcon } from "@/modules/orders/components/ProductIcon";
import { fileToDataUrl, makeSquareIcon, prepareForUpload } from "@/core/ai/image";
import { identifyProduct, type Identification } from "@/core/ai/client";

const UNITS = ["ud", "caja", "kg", "L", "botella", "barril", "paquete"];

type Phase = "idle" | "analyzing" | "ready";

export function ScannerView() {
  const { suppliers, products, addProduct } = useOrders();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [photoIcon, setPhotoIcon] = useState<string | null>(null);
  const [aiEmoji, setAiEmoji] = useState<string>("📦");
  const [useEmoji, setUseEmoji] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", unit: "ud", supplierId: "" });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const reset = () => {
    setPhoto(null);
    setPhotoIcon(null);
    setAiEmoji("📦");
    setUseEmoji(false);
    setPhase("idle");
    setError(null);
    setForm({ name: "", unit: "ud", supplierId: "" });
    if (fileRef.current) fileRef.current.value = "";
  };

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setAdded(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPhoto(dataUrl);
      setPhotoIcon(await makeSquareIcon(dataUrl, 128));
      setPhase("analyzing");

      const { base64, mimeType } = await prepareForUpload(dataUrl);
      const result: Identification = await identifyProduct(base64, mimeType);
      setForm({ name: result.name, unit: result.unit, supplierId: "" });
      setAiEmoji(result.emoji || "📦");
      setPhase("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
      // Aun con fallo de IA, mostramos el formulario para añadir a mano.
      setForm({ name: "", unit: "ud", supplierId: "" });
      setAiEmoji("📦");
      setPhase("ready");
    }
  };

  const addToCatalog = () => {
    const supplierId = form.supplierId || suppliers[0]?.id;
    if (!form.name.trim() || !supplierId) return;
    const icon = useEmoji ? aiEmoji : photoIcon ?? aiEmoji;
    addProduct({ name: form.name.trim(), supplierId, unit: form.unit, icon });
    setAdded(`«${form.name.trim()}» añadido al catálogo.`);
    reset();
  };

  const input =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
        Módulo experimental. Identifica productos con IA (Gemini) desde la cámara.
      </div>

      {added && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          ✓ {added}
        </div>
      )}

      {suppliers.length === 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
          Crea al menos un proveedor en «Pedidos → Proveedores» para poder añadir productos.
        </div>
      )}

      {/* Captura */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 text-center shadow-sm">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="captura" className="mx-auto max-h-64 rounded-lg object-contain" />
        ) : (
          <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 text-neutral-400">
            Sin imagen
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="mt-4 rounded-lg bg-brand px-5 py-2 font-medium text-white hover:opacity-90"
        >
          📷 {photo ? "Hacer otra foto" : "Hacer foto / subir imagen"}
        </button>
      </div>

      {phase === "analyzing" && (
        <p className="text-center text-sm text-neutral-500">Analizando con IA…</p>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Formulario tras identificar */}
      {phase === "ready" && (
        <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Revisar y añadir</h2>

          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500">Icono:</span>
            <button
              type="button"
              onClick={() => setUseEmoji(false)}
              className={`rounded-lg border p-1 ${!useEmoji ? "border-brand" : "border-neutral-200"}`}
              title="Usar foto"
            >
              <ProductIcon icon={photoIcon ?? undefined} size={36} />
            </button>
            <button
              type="button"
              onClick={() => setUseEmoji(true)}
              className={`rounded-lg border p-1 ${useEmoji ? "border-brand" : "border-neutral-200"}`}
              title="Usar emoji"
            >
              <ProductIcon icon={aiEmoji} size={36} />
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Nombre</label>
            <input className={input} value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="mb-1 block text-sm font-medium">Proveedor</label>
              <select
                className={input}
                value={form.supplierId || suppliers[0]?.id || ""}
                onChange={(e) => set({ supplierId: e.target.value })}
                disabled={suppliers.length === 0}
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={addToCatalog}
              disabled={suppliers.length === 0 || !form.name.trim()}
              className="flex-1 rounded-lg bg-brand py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Añadir al catálogo
            </button>
            <button onClick={reset} className="rounded-lg border border-neutral-300 px-4 hover:bg-neutral-100">
              Descartar
            </button>
          </div>

          <p className="text-xs text-neutral-400">
            Productos en el catálogo: {products.length}
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConfig } from "@/core/config/ConfigProvider";
import { drawSuggestions, ensureFonts, formatPrice, loadImage, measureContentHeight, type SuggestionItem } from "./renderSuggestions";
import { listTemplates, type SuggestionTemplate } from "./templatesApi";
import { useSuggestionDishes } from "./store";
import { uid } from "@/core/util/id";

type Row = SuggestionItem & { _k: string };
const newRow = (name = "", price = ""): Row => ({ _k: uid(), name, price });
type Layout = "priced" | "centered";

export function SuggestionsEditor() {
  const { config } = useConfig();
  const settings = config.modules["sugerencias"]?.settings ?? {};
  const textColor = (settings.textColor as string) || "#37352f";

  const { dishes, saveDish, removeDish } = useSuggestionDishes();

  const [templates, setTemplates] = useState<SuggestionTemplate[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [items, setItems] = useState<Row[]>([newRow(), newRow(), newRow()]);
  const [layout, setLayout] = useState<Layout>("priced");
  const [showCatalog, setShowCatalog] = useState(false);
  const [search, setSearch] = useState("");

  // Ajustes de texto (con valores por defecto = render original)
  const [fontScale, setFontScale] = useState(1);
  const [lineSpacing, setLineSpacing] = useState(1.34);
  const [itemSpacing, setItemSpacing] = useState(0.42);
  const [startY, setStartY] = useState(0.12);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Carga la lista de plantillas (al montar y al volver el foco).
  useEffect(() => {
    const load = () => listTemplates().then(setTemplates).catch(() => setTemplates([]));
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  const selected = templates.find((t) => t.file === selectedFile) ?? templates[0];
  const templateSrc = selected?.src;

  useEffect(() => {
    if (templates.length && !templates.some((t) => t.file === selectedFile)) {
      setSelectedFile(templates[0].file);
    }
  }, [templates, selectedFile]);

  useEffect(() => {
    if (!templateSrc) {
      setStatus(templates.length === 0 ? "error" : "loading");
      return;
    }
    let active = true;
    setStatus("loading");
    Promise.all([loadImage(templateSrc), ensureFonts()])
      .then(([img]) => {
        if (!active) return;
        imgRef.current = img;
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
        }
        setStatus("ready");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [templateSrc, templates.length]);

  const drawWith = useCallback(
    (l: Layout) => {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas || !img || !templateSrc) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      drawSuggestions(ctx, img, { items }, { templateSrc, textColor, layout: l, fontScale, lineSpacing, itemSpacing, startY });
    },
    [items, templateSrc, textColor, fontScale, lineSpacing, itemSpacing, startY]
  );

  useEffect(() => {
    if (status === "ready") drawWith(layout);
  }, [status, drawWith, layout]);

  /** Reduce el tamaño de fuente hasta que todos los platos caben sobre la plantilla. */
  const autoFit = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const H = img.naturalHeight || img.height;
    // La zona de platos termina antes del texto fijo "TODO SE SIRVE…".
    const target = Math.max(0.12, 0.63 - startY) * H;
    let best = 0.45;
    for (let s = 1.4; s >= 0.45; s -= 0.02) {
      const h = measureContentHeight(ctx, img, { items }, { templateSrc: "", textColor, layout, fontScale: s, lineSpacing, itemSpacing, startY });
      if (h <= target) {
        best = s;
        break;
      }
    }
    setFontScale(Number(best.toFixed(2)));
  };

  const resetText = () => {
    setFontScale(1);
    setLineSpacing(1.34);
    setItemSpacing(0.42);
    setStartY(0.12);
  };

  const downloadAs = (l: Layout) => {
    const canvas = canvasRef.current;
    if (!canvas || status !== "ready") return;
    ensureFonts().then(() => {
      drawWith(l);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = l === "centered" ? "sugerencias_sin_precios.png" : "sugerencias_fin_de_semana.png";
      a.click();
      drawWith(layout); // restaura la vista previa
    });
  };

  // Helpers de lista
  const setItem = (i: number, patch: Partial<SuggestionItem>) =>
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = (it?: SuggestionItem) => setItems((list) => [...list, newRow(it?.name, it?.price)]);
  const removeItem = (i: number) => setItems((list) => list.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setItems((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const filteredDishes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? dishes.filter((d) => d.name.toLowerCase().includes(q)) : dishes;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [dishes, search]);

  const input = "rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";

  return (
    <div className="space-y-4">
      {/* Selector de plantilla */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Plantilla</h2>
          <span className="text-xs text-neutral-400">Súbelas en Configuración → Sugerencias</span>
        </div>
        {templates.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-center text-xs text-neutral-400">
            No hay plantillas de sugerencias. Sube la hoja en limpio en Configuración.
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {templates.map((t) => (
              <button
                key={t.file}
                onClick={() => setSelectedFile(t.file)}
                className={`shrink-0 overflow-hidden rounded-xl border-2 transition ${selected?.file === t.file ? "border-brand" : "border-neutral-200 hover:border-neutral-300"}`}
                title={t.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.src} alt={t.name} className="h-24 w-20 bg-neutral-50 object-cover" />
                <span className="block max-w-20 truncate px-1 py-0.5 text-[11px] text-neutral-600">{t.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Platos y precios</h2>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setShowCatalog((s) => !s)} className="text-sm text-neutral-500 hover:underline">
                  📚 Guardados ({dishes.length})
                </button>
                <button type="button" onClick={() => addItem()} className="text-sm text-brand hover:underline">+ Añadir plato</button>
              </div>
            </div>

            {/* Catálogo de platos guardados */}
            {showCatalog && (
              <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <input
                  className={`${input} mb-2 w-full`}
                  value={search}
                  placeholder="Buscar plato guardado…"
                  onChange={(e) => setSearch(e.target.value)}
                />
                {filteredDishes.length === 0 ? (
                  <p className="py-2 text-center text-xs text-neutral-400">
                    {dishes.length === 0 ? "Aún no has guardado platos. Pulsa ⭐ en un plato para guardarlo." : "Sin resultados."}
                  </p>
                ) : (
                  <ul className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
                    {filteredDishes.map((d) => (
                      <li key={d.id} className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white py-1 pl-3 pr-1 text-xs">
                        <button
                          type="button"
                          onClick={() => addItem({ name: d.name, price: d.price })}
                          className="font-medium text-neutral-700 hover:text-brand"
                          title="Añadir a la lista"
                        >
                          {d.name}{d.price ? ` · ${formatPrice(d.price)}` : ""}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDish(d.id)}
                          className="rounded-full px-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500"
                          title="Eliminar de guardados"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={it._k} className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-xs text-neutral-400 hover:text-neutral-700 disabled:opacity-30">▲</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="px-1 text-xs text-neutral-400 hover:text-neutral-700 disabled:opacity-30">▼</button>
                  </div>
                  <input
                    className={`${input} min-w-0 flex-1`}
                    value={it.name}
                    placeholder={`Plato ${i + 1}`}
                    onChange={(e) => setItem(i, { name: e.target.value })}
                  />
                  <input
                    className={`${input} w-20`}
                    value={it.price}
                    placeholder="12.00"
                    inputMode="decimal"
                    onChange={(e) => setItem(i, { price: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => it.name.trim() && saveDish(it.name, it.price)}
                    disabled={!it.name.trim()}
                    className="rounded-lg px-1.5 text-neutral-300 hover:bg-amber-50 hover:text-amber-500 disabled:opacity-30"
                    title="Guardar plato en la base de datos"
                  >
                    ⭐
                  </button>
                  <button type="button" onClick={() => removeItem(i)} className="rounded-lg px-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-500">✕</button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-400">El € se añade solo. ⭐ guarda el plato para reutilizarlo. Flechas para reordenar.</p>
          </div>

          {/* Ajustes de texto */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Ajustes de texto</h2>
              <div className="flex items-center gap-3">
                <button type="button" onClick={autoFit} className="text-sm text-brand hover:underline">✨ Auto-ajustar</button>
                <button type="button" onClick={resetText} className="text-sm text-neutral-500 hover:underline">↺ Restablecer</button>
              </div>
            </div>
            <div className="space-y-3">
              <Slider label="Tamaño de fuente" value={fontScale} min={0.5} max={1.5} step={0.02} onChange={setFontScale} format={(v) => `${Math.round(v * 100)}%`} />
              <Slider label="Interlineado" value={lineSpacing} min={1} max={2} step={0.02} onChange={setLineSpacing} format={(v) => v.toFixed(2)} />
              <Slider label="Separación entre platos" value={itemSpacing} min={0} max={1.2} step={0.02} onChange={setItemSpacing} format={(v) => v.toFixed(2)} />
              <Slider label="Margen superior" value={startY} min={0.05} max={0.4} step={0.005} onChange={setStartY} format={(v) => `${Math.round(v * 100)}%`} />
            </div>
            <p className="mt-2 text-xs text-neutral-400">Si hay muchos platos, usa «Auto-ajustar» o baja el tamaño de fuente.</p>
          </div>

          {/* Formato de la vista previa */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-semibold">Vista previa</p>
            <div className="inline-flex rounded-xl bg-neutral-100 p-1 text-sm">
              <button
                onClick={() => setLayout("priced")}
                className={`rounded-lg px-3 py-1.5 transition ${layout === "priced" ? "bg-white shadow-sm" : "text-neutral-500"}`}
              >
                Con precios
              </button>
              <button
                onClick={() => setLayout("centered")}
                className={`rounded-lg px-3 py-1.5 transition ${layout === "centered" ? "bg-white shadow-sm" : "text-neutral-500"}`}
              >
                Centrado sin precios
              </button>
            </div>
          </div>

          {/* Descargas */}
          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={() => downloadAs("priced")} disabled={status !== "ready"} className="rounded-lg bg-brand py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              ⬇ Con precios
            </button>
            <button onClick={() => downloadAs("centered")} disabled={status !== "ready"} className="rounded-lg border border-brand py-3 text-sm font-medium text-brand hover:bg-brand/5 disabled:opacity-50">
              ⬇ Centrado sin precios
            </button>
          </div>
        </div>

        {/* Vista previa */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-neutral-500">
            {layout === "centered" ? "Centrado sin precios" : "Con precios"}
          </h2>
          {status === "error" ? (
            <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 p-6 text-center text-sm text-amber-800">
              <p className="font-semibold">Sin plantilla seleccionada.</p>
              <p className="mt-2">Sube la hoja en limpio en Configuración → Sugerencias.</p>
            </div>
          ) : (
            <canvas ref={canvasRef} className="mx-auto h-auto w-full max-w-sm rounded-lg shadow" style={{ display: status === "ready" ? "block" : "none" }} />
          )}
          {status === "loading" && <p className="text-center text-sm text-neutral-400">Cargando plantilla…</p>}
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-neutral-600">{label}</span>
        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-500">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand"
      />
    </label>
  );
}

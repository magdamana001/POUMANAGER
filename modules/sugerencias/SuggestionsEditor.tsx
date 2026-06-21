"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConfig } from "@/core/config/ConfigProvider";
import { drawSuggestions, ensureFonts, loadImage, type SuggestionItem } from "./renderSuggestions";
import { listTemplates, type SuggestionTemplate } from "./templatesApi";

const EMPTY: SuggestionItem = { name: "", price: "" };

export function SuggestionsEditor() {
  const { config } = useConfig();
  const settings = config.modules["sugerencias"]?.settings ?? {};
  const textColor = (settings.textColor as string) || "#37352f";

  const [templates, setTemplates] = useState<SuggestionTemplate[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [items, setItems] = useState<SuggestionItem[]>([{ ...EMPTY }, { ...EMPTY }, { ...EMPTY }]);

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

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !templateSrc) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawSuggestions(ctx, img, { items }, { templateSrc, textColor });
  }, [items, templateSrc, textColor]);

  useEffect(() => {
    if (status === "ready") redraw();
  }, [status, redraw]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || status !== "ready") return;
    ensureFonts().then(() => {
      redraw();
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "sugerencias_fin_de_semana.png";
      a.click();
    });
  };

  // Helpers de lista
  const setItem = (i: number, patch: Partial<SuggestionItem>) =>
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () => setItems((list) => [...list, { ...EMPTY }]);
  const removeItem = (i: number) => setItems((list) => list.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setItems((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

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
              <button type="button" onClick={addItem} className="text-sm text-brand hover:underline">+ Añadir plato</button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2">
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
                    className={`${input} w-24`}
                    value={it.price}
                    placeholder="12.00"
                    inputMode="decimal"
                    onChange={(e) => setItem(i, { price: e.target.value })}
                  />
                  <button type="button" onClick={() => removeItem(i)} className="rounded-lg px-2 text-neutral-400 hover:bg-neutral-100 hover:text-red-500">✕</button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-400">El símbolo € se añade solo. Usa las flechas para reordenar.</p>
          </div>

          <button onClick={download} disabled={status !== "ready"} className="w-full rounded-lg bg-brand py-3 font-medium text-white hover:opacity-90 disabled:opacity-50">
            ⬇ Descargar sugerencias en imagen (PNG)
          </button>
        </div>

        {/* Vista previa */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-neutral-500">Vista previa</h2>
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

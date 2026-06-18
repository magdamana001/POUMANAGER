"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConfig } from "@/core/config/ConfigProvider";
import { drawMenu, ensureFonts, loadImage } from "./renderMenu";
import { listTemplates, type MenuTemplate } from "./templatesApi";

const DAYS = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO", "DOMINGO"];

function todayDay(): string {
  return DAYS[(new Date().getDay() + 6) % 7];
}

function DishList({ title, dishes, onChange }: { title: string; dishes: string[]; onChange: (next: string[]) => void }) {
  const set = (i: number, v: string) => onChange(dishes.map((d, idx) => (idx === i ? v : d)));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium">{title}</label>
        <button type="button" onClick={() => onChange([...dishes, ""])} className="text-sm text-brand hover:underline">+ Añadir</button>
      </div>
      <div className="space-y-2">
        {dishes.map((d, i) => (
          <div key={i} className="flex gap-2">
            <input className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none" value={d} placeholder={`Plato ${i + 1}`} onChange={(e) => set(i, e.target.value)} />
            {dishes.length > 1 && (
              <button type="button" onClick={() => onChange(dishes.filter((_, idx) => idx !== i))} className="rounded-lg px-2 text-neutral-400 hover:bg-neutral-100 hover:text-red-500">✕</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MenuEditor() {
  const { config } = useConfig();
  const settings = config.modules["menus"]?.settings ?? {};
  const textColor = (settings.textColor as string) || "#37352f";

  const [templates, setTemplates] = useState<MenuTemplate[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");

  const [day, setDay] = useState(todayDay());
  const [primeros, setPrimeros] = useState<string[]>(["", ""]);
  const [segundos, setSegundos] = useState<string[]>(["", ""]);

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

  // Si cambia la lista y no hay selección válida, selecciona la primera.
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
    drawMenu(ctx, img, { day, primeros, segundos }, { templateSrc, textColor });
  }, [day, primeros, segundos, templateSrc, textColor]);

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
      a.download = `menu_${day.toLowerCase()}.png`;
      a.click();
    });
  };

  const input = "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";

  return (
    <div className="space-y-4">
      {/* Selector de plantilla */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Plantilla</h2>
          <span className="text-xs text-neutral-400">Súbelas en Configuración → Menús del día</span>
        </div>
        {templates.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-center text-xs text-neutral-400">
            No hay plantillas en public/templates. Sube alguna en Configuración.
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
            <label className="mb-1 block text-sm font-medium">Día</label>
            <select className={input} value={day} onChange={(e) => setDay(e.target.value)}>
              {DAYS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <DishList title="Primeros" dishes={primeros} onChange={setPrimeros} />
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <DishList title="Segundos" dishes={segundos} onChange={setSegundos} />
          </div>
          <button onClick={download} disabled={status !== "ready"} className="w-full rounded-lg bg-brand py-3 font-medium text-white hover:opacity-90 disabled:opacity-50">
            ⬇ Descargar menú en imagen (PNG)
          </button>
        </div>

        {/* Vista previa */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-neutral-500">Vista previa</h2>
          {status === "error" ? (
            <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 p-6 text-center text-sm text-amber-800">
              <p className="font-semibold">Sin plantilla seleccionada.</p>
              <p className="mt-2">Sube una en Configuración → Menús del día, o coloca <code className="rounded bg-amber-100 px-1">public/templates/menu-dia.png</code>.</p>
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

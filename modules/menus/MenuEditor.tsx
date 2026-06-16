"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConfig } from "@/core/config/ConfigProvider";
import { drawMenu, ensureFonts, loadImage, type MenuData } from "./renderMenu";

const DAYS = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO", "DOMINGO"];

function todayDay(): string {
  return DAYS[(new Date().getDay() + 6) % 7];
}

/** Lista editable de platos (primeros o segundos). */
function DishList({
  title,
  dishes,
  onChange,
}: {
  title: string;
  dishes: string[];
  onChange: (next: string[]) => void;
}) {
  const set = (i: number, v: string) =>
    onChange(dishes.map((d, idx) => (idx === i ? v : d)));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium">{title}</label>
        <button
          type="button"
          onClick={() => onChange([...dishes, ""])}
          className="text-sm text-brand hover:underline"
        >
          + Añadir
        </button>
      </div>
      <div className="space-y-2">
        {dishes.map((d, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              value={d}
              placeholder={`Plato ${i + 1}`}
              onChange={(e) => set(i, e.target.value)}
            />
            {dishes.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(dishes.filter((_, idx) => idx !== i))}
                className="rounded-lg px-2 text-neutral-400 hover:bg-neutral-100 hover:text-red-500"
              >
                ✕
              </button>
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
  const templateSrc = (settings.templateSrc as string) || "/templates/menu-dia.png";
  const textColor = (settings.textColor as string) || "#37352f";

  const [day, setDay] = useState(todayDay());
  const [primeros, setPrimeros] = useState<string[]>(["", ""]);
  const [segundos, setSegundos] = useState<string[]>(["", ""]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Carga la plantilla una sola vez (o cuando cambia la ruta).
  useEffect(() => {
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
  }, [templateSrc]);

  const data: MenuData = { day, primeros, segundos };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawMenu(ctx, img, { day, primeros, segundos }, { templateSrc, textColor });
  }, [day, primeros, segundos, templateSrc, textColor]);

  // Redibuja en cada cambio una vez la plantilla está lista.
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

  const input =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Editor */}
      <div className="space-y-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <label className="mb-1 block text-sm font-medium">Día</label>
          <select className={input} value={day} onChange={(e) => setDay(e.target.value)}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <DishList title="Primeros" dishes={primeros} onChange={setPrimeros} />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <DishList title="Segundos" dishes={segundos} onChange={setSegundos} />
        </div>

        <button
          onClick={download}
          disabled={status !== "ready"}
          className="w-full rounded-lg bg-brand py-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          ⬇ Descargar menú en imagen (PNG)
        </button>
      </div>

      {/* Vista previa */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">Vista previa</h2>
        {status === "error" ? (
          <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 p-6 text-center text-sm text-amber-800">
            <p className="font-semibold">No se encuentra la plantilla.</p>
            <p className="mt-2">
              Guarda la imagen en blanco como{" "}
              <code className="rounded bg-amber-100 px-1">public/templates/menu-dia.png</code>{" "}
              o cambia la ruta en Configuración → Menús del día.
            </p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="mx-auto h-auto w-full max-w-sm rounded-lg shadow"
            style={{ display: status === "ready" ? "block" : "none" }}
          />
        )}
        {status === "loading" && (
          <p className="text-center text-sm text-neutral-400">Cargando plantilla…</p>
        )}
      </div>
    </div>
  );
}

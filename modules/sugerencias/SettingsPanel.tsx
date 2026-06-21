"use client";

import { useEffect, useRef, useState } from "react";
import { fileToDataUrl, resizeToDataUrl } from "./imageUtil";
import { deleteTemplate, listTemplates, uploadTemplate, type SuggestionTemplate } from "./templatesApi";

/** Gestión de plantillas de sugerencias (archivos en public/templates). */
export function SuggestionsTemplatesSettings() {
  const [templates, setTemplates] = useState<SuggestionTemplate[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => listTemplates().then(setTemplates).catch(() => {});
  useEffect(() => {
    refresh();
  }, []);

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const dataUrl = await fileToDataUrl(file);
        const png = await resizeToDataUrl(dataUrl, 1080);
        await uploadTemplate(png);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDelete = async (t: SuggestionTemplate) => {
    if (!confirm(`¿Eliminar la plantilla "${t.file}"?`)) return;
    await deleteTemplate(t.file);
    refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Plantillas de sugerencias</p>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Subiendo…" : "⬆ Subir plantilla"}
        </button>
      </div>
      <p className="text-xs text-neutral-400">
        Se guardan como archivos en <code className="rounded bg-neutral-100 px-1">public/templates</code> (sugerencia1.png, sugerencia2.png…).
      </p>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {templates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-center text-xs text-neutral-400">
          No hay plantillas de sugerencias todavía. Sube la hoja en limpio.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {templates.map((t) => (
            <li key={t.file} className="flex items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.src} alt={t.name} className="h-12 w-10 shrink-0 rounded object-cover" />
              <span className="min-w-0 flex-1 truncate text-sm">{t.file}</span>
              <button onClick={() => onDelete(t)} className="shrink-0 rounded px-2 py-1 text-red-500 hover:bg-red-50">✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

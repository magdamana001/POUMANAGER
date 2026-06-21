export interface SuggestionTemplate {
  name: string;
  file: string;
  src: string;
}

const KIND = "sugerencias";

/** Lista las plantillas de sugerencias (public/templates, prefijo sugerencia). */
export async function listTemplates(): Promise<SuggestionTemplate[]> {
  const res = await fetch(`/api/templates?kind=${KIND}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { templates: SuggestionTemplate[] };
  return data.templates ?? [];
}

/** Sube una plantilla (data URL) → la guarda como sugerenciaN.png. */
export async function uploadTemplate(dataUrl: string): Promise<SuggestionTemplate> {
  const res = await fetch(`/api/templates?kind=${KIND}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "No se pudo subir la plantilla");
  }
  return (await res.json()) as SuggestionTemplate;
}

/** Elimina una plantilla por nombre de archivo. */
export async function deleteTemplate(file: string): Promise<void> {
  await fetch(`/api/templates?file=${encodeURIComponent(file)}`, { method: "DELETE" });
}

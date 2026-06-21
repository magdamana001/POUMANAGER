export interface MenuTemplate {
  name: string;
  file: string;
  src: string;
}

/** Lista las plantillas almacenadas en public/templates. */
export async function listTemplates(): Promise<MenuTemplate[]> {
  const res = await fetch("/api/templates?kind=menus", { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { templates: MenuTemplate[] };
  return data.templates ?? [];
}

/** Sube una plantilla (data URL) → la guarda como menu-diaN.png. */
export async function uploadTemplate(dataUrl: string): Promise<MenuTemplate> {
  const res = await fetch("/api/templates?kind=menus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "No se pudo subir la plantilla");
  }
  return (await res.json()) as MenuTemplate;
}

/** Elimina una plantilla por nombre de archivo. */
export async function deleteTemplate(file: string): Promise<void> {
  await fetch(`/api/templates?file=${encodeURIComponent(file)}`, { method: "DELETE" });
}

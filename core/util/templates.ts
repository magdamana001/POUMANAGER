/**
 * Cliente de la API de plantillas (public/templates), parametrizado por "kind"
 * para que cada módulo gestione sus propias plantillas sin duplicar código.
 */

export interface Template {
  name: string;
  file: string;
  src: string;
}

export async function listTemplates(kind: string): Promise<Template[]> {
  const res = await fetch(`/api/templates?kind=${encodeURIComponent(kind)}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { templates: Template[] };
  return data.templates ?? [];
}

export async function uploadTemplate(kind: string, dataUrl: string): Promise<Template> {
  const res = await fetch(`/api/templates?kind=${encodeURIComponent(kind)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "No se pudo subir la plantilla");
  }
  return (await res.json()) as Template;
}

export async function deleteTemplate(file: string): Promise<void> {
  await fetch(`/api/templates?file=${encodeURIComponent(file)}`, { method: "DELETE" });
}

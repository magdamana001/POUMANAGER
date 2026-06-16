/** Llamadas a las rutas de IA del servidor (Gemini). */

export interface Identification {
  name: string;
  unit: string;
  emoji: string;
}

/** Identifica un producto a partir de una imagen. */
export async function identifyProduct(
  base64: string,
  mimeType: string
): Promise<Identification> {
  const res = await fetch("/api/identify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64, mimeType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al identificar el producto");
  }
  return (await res.json()) as Identification;
}

/**
 * Genera una miniatura profesional del producto. Si se pasa una imagen, la
 * reconvierte (edición); si no, la crea a partir del nombre.
 * Devuelve un data URL de imagen.
 */
export async function generateThumbnail(opts: {
  imageBase64?: string;
  mimeType?: string;
  name?: string;
}): Promise<string> {
  const res = await fetch("/api/thumbnail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al generar la miniatura");
  }
  const { image } = (await res.json()) as { image: string };
  if (!image) throw new Error("La IA no devolvió imagen");
  return image;
}

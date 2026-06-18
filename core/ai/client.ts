/** Llamadas a las rutas de IA del servidor (Gemini). */

export interface Identification {
  name: string;
  unit: string;
  emoji: string;
}

/** Línea extraída de un albarán/factura. */
export interface InvoiceLine {
  name: string;
  qty: number;
  unit: string;
  price: number;
}

export interface InvoiceScan {
  lines: InvoiceLine[];
  supplier?: string;
  date?: string;
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
 * Genera una miniatura profesional o un logo. Si se pasa una imagen, la
 * reconvierte; si no, la crea a partir del nombre/contexto.
 * Devuelve un data URL de imagen.
 */
export async function generateThumbnail(opts: {
  imageBase64?: string;
  mimeType?: string;
  name?: string;
  /** "product" (por defecto) o "logo". */
  mode?: "product" | "logo";
  /** Contexto extra (p. ej. productos que suministra) para el logo. */
  context?: string;
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

/** Escanea un albarán/factura y extrae sus líneas (nombre, cantidad, precio). */
export async function scanInvoice(base64: string, mimeType: string): Promise<InvoiceScan> {
  const res = await fetch("/api/invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64, mimeType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al escanear el albarán");
  }
  return (await res.json()) as InvoiceScan;
}

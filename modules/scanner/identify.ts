export interface Identification {
  name: string;
  unit: string;
  emoji: string;
}

/** Lee un archivo de imagen como data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

/** Carga una imagen desde un data URL. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Imagen no válida"));
    img.src = src;
  });
}

/**
 * Crea un icono cuadrado (recorte centrado) a partir de una imagen.
 * Devuelve un data URL JPEG ligero, ideal para el catálogo.
 */
export async function makeSquareIcon(dataUrl: string, size = 128): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.8);
}

/**
 * Reduce la imagen a un ancho máximo para enviarla a Gemini (más rápido y
 * dentro de límites). Devuelve { base64, mimeType }.
 */
export async function prepareForUpload(
  dataUrl: string,
  maxWidth = 768
): Promise<{ base64: string; mimeType: string }> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxWidth / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL("image/jpeg", 0.85);
  return { base64: out.split(",")[1] ?? "", mimeType: "image/jpeg" };
}

/** Llama a la API del servidor para identificar el producto. */
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

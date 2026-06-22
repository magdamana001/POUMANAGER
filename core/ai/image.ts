/** Utilidades de imagen para IA (canvas). Reutiliza las utilidades base de core/util/canvas. */

import { fileToDataUrl, loadImage } from "@/core/util/canvas";

export { fileToDataUrl };

/** Crea un icono cuadrado (recorte centrado) JPEG ligero. */
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
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** Reduce la imagen y devuelve { base64, mimeType } para enviar a la IA. */
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

import { loadImage } from "./renderSuggestions";

/** Lee un archivo de imagen como data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

/** Reescala una imagen a un ancho máximo conservando proporción (PNG). */
export async function resizeToDataUrl(dataUrl: string, maxW = 1080): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxW / (img.naturalWidth || img.width));
  const w = Math.round((img.naturalWidth || img.width) * scale);
  const h = Math.round((img.naturalHeight || img.height) * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

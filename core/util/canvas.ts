/** Utilidades de imagen/canvas en el navegador, reutilizables por core y módulos. */

/** Lee un archivo de imagen como data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

/** Carga una imagen lista para dibujar en canvas (mismo origen / data URL). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = src;
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

/** Asegura que la fuente Cormorant Garamond esté disponible para canvas. */
export async function ensureFonts(): Promise<void> {
  try {
    if (typeof document === "undefined" || !document.fonts) return;
    await Promise.all([
      document.fonts.load('600 32px "Cormorant Garamond"'),
      document.fonts.load('italic 500 32px "Cormorant Garamond"'),
    ]);
    await document.fonts.ready;
  } catch {
    /* si falla, se usa la fuente serif por defecto */
  }
}

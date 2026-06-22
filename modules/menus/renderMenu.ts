export interface MenuData {
  day: string;
  primeros: string[];
  segundos: string[];
}

export interface RenderOptions {
  templateSrc: string;
  textColor: string;
}

export { loadImage, ensureFonts } from "@/core/util/canvas";

/**
 * Dibuja el día + platos sobre la plantilla, replicando el ejemplo:
 * día centrado arriba, primeros, línea separadora y segundos.
 */
export function drawMenu(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  data: MenuData,
  opts: RenderOptions
): void {
  const W = img.naturalWidth || img.width;
  const H = img.naturalHeight || img.height;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);

  const cx = W / 2;
  const color = opts.textColor || "#37352f";
  const lineH = 0.0365 * H;

  // --- Día ---
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 ${Math.round(0.046 * W)}px "Cormorant Garamond", Georgia, serif`;
  // letterSpacing no está en todos los navegadores: se aplica si existe.
  const anyCtx = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const prevSpacing = anyCtx.letterSpacing;
  anyCtx.letterSpacing = `${Math.round(0.006 * W)}px`;
  ctx.fillText((data.day || "").toUpperCase(), cx, 0.165 * H);
  anyCtx.letterSpacing = prevSpacing ?? "0px";

  // --- Platos ---
  const primeros = data.primeros.map((s) => s.trim()).filter(Boolean);
  const segundos = data.segundos.map((s) => s.trim()).filter(Boolean);

  ctx.font = `italic 500 ${Math.round(0.046 * W)}px "Cormorant Garamond", Georgia, serif`;

  let y = 0.225 * H;
  for (const dish of primeros) {
    ctx.fillText(dish, cx, y);
    y += lineH;
  }

  // Separador entre primeros y segundos (como en el ejemplo)
  if (primeros.length && segundos.length) {
    const sepW = 0.22 * W;
    const sepY = y - lineH * 0.45;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, 0.0015 * W);
    ctx.beginPath();
    ctx.moveTo(cx - sepW / 2, sepY);
    ctx.lineTo(cx + sepW / 2, sepY);
    ctx.stroke();
    y += lineH * 0.55;
  }

  for (const dish of segundos) {
    ctx.fillText(dish, cx, y);
    y += lineH;
  }
}

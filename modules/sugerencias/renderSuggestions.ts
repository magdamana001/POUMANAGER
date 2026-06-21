export interface SuggestionItem {
  name: string;
  price: string;
}

export interface SuggestionsData {
  items: SuggestionItem[];
}

export interface RenderOptions {
  templateSrc: string;
  textColor: string;
  /** "priced": nombre izq + precio der (por defecto). "centered": centrado sin precios. */
  layout?: "priced" | "centered";
  /** Multiplicador del tamaño de fuente (1 = por defecto). */
  fontScale?: number;
  /** Interlineado (alto de línea relativo a la fuente; 1.34 por defecto). */
  lineSpacing?: number;
  /** Separación extra entre platos (relativa a la línea; 0.42 por defecto). */
  itemSpacing?: number;
  /** Margen superior donde empieza la lista (fracción del alto; 0.12 por defecto). */
  startY?: number;
}

/** Carga una imagen (mismo origen) lista para dibujar en canvas. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la plantilla"));
    img.src = src;
  });
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

/** Formatea un precio: numérico => "12.00€"; texto => tal cual (con € si falta). */
export function formatPrice(raw: string): string {
  const t = (raw || "").trim();
  if (!t) return "";
  const normalized = t.replace(",", ".").replace(/[€\s]/g, "");
  const n = Number(normalized);
  if (!Number.isNaN(n) && /^[\d.]+$/.test(normalized)) return `${n.toFixed(2)}€`;
  return /€/.test(t) ? t : `${t}€`;
}

/** Divide un texto en líneas que caben en maxWidth (según la fuente activa). */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/**
 * Dibuja la lista de sugerencias (nombre a la izquierda, precio a la derecha)
 * sobre la plantilla. Los nombres largos se ajustan en varias líneas y el
 * precio queda alineado con la primera línea de cada plato.
 */
export function drawSuggestions(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  data: SuggestionsData,
  opts: RenderOptions
): void {
  const W = img.naturalWidth || img.width;
  const H = img.naturalHeight || img.height;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);

  const color = opts.textColor || "#37352f";
  const Lx = 0.045 * W; // margen izquierdo (nombres)
  const Rx = 0.955 * W; // margen derecho (precios)
  const cx = W / 2;
  const fontSize = Math.round(0.04 * W * (opts.fontScale ?? 1));
  const lineH = fontSize * (opts.lineSpacing ?? 1.34);
  const itemGap = lineH * (opts.itemSpacing ?? 0.42);
  const centered = opts.layout === "centered";

  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";

  const items = data.items
    .map((it) => ({ name: (it.name || "").trim(), price: formatPrice(it.price) }))
    .filter((it) => it.name);

  let y = (opts.startY ?? 0.12) * H;

  if (centered) {
    // Layout centrado, sin precios.
    const maxW = 0.86 * W;
    ctx.textAlign = "center";
    ctx.font = `italic 500 ${fontSize}px "Cormorant Garamond", Georgia, serif`;
    for (const it of items) {
      const lines = wrapText(ctx, it.name, maxW);
      for (const line of lines) {
        ctx.fillText(line, cx, y);
        y += lineH;
      }
      y += itemGap;
    }
    return;
  }

  for (const it of items) {
    // Precio (derecha) primero para reservar el ancho del nombre.
    ctx.textAlign = "right";
    ctx.font = `500 ${fontSize}px "Cormorant Garamond", Georgia, serif`;
    const priceW = it.price ? ctx.measureText(it.price).width : 0;

    // Nombre (izquierda, cursiva) con ajuste de línea.
    ctx.textAlign = "left";
    ctx.font = `italic 500 ${fontSize}px "Cormorant Garamond", Georgia, serif`;
    const nameMaxW = Rx - Lx - (priceW ? priceW + 0.02 * W : 0);
    const lines = wrapText(ctx, it.name, nameMaxW);

    for (let i = 0; i < lines.length; i++) {
      ctx.textAlign = "left";
      ctx.font = `italic 500 ${fontSize}px "Cormorant Garamond", Georgia, serif`;
      ctx.fillText(lines[i], Lx, y);
      if (i === 0 && it.price) {
        ctx.textAlign = "right";
        ctx.font = `500 ${fontSize}px "Cormorant Garamond", Georgia, serif`;
        ctx.fillText(it.price, Rx, y);
      }
      y += lineH;
    }
    y += itemGap;
  }
}

/**
 * Calcula la altura total (px) que ocuparía la lista con las opciones dadas,
 * contando los saltos de línea de los nombres largos. Útil para auto-ajuste.
 */
export function measureContentHeight(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  data: SuggestionsData,
  opts: RenderOptions
): number {
  const W = img.naturalWidth || img.width;
  const fontSize = Math.round(0.04 * W * (opts.fontScale ?? 1));
  const lineH = fontSize * (opts.lineSpacing ?? 1.34);
  const itemGap = lineH * (opts.itemSpacing ?? 0.42);
  const centered = opts.layout === "centered";
  const Lx = 0.045 * W;
  const Rx = 0.955 * W;

  const items = data.items
    .map((it) => ({ name: (it.name || "").trim(), price: formatPrice(it.price) }))
    .filter((it) => it.name);
  if (items.length === 0) return 0;

  let total = 0;
  for (const it of items) {
    let nameMaxW: number;
    if (centered) {
      ctx.font = `italic 500 ${fontSize}px "Cormorant Garamond", Georgia, serif`;
      nameMaxW = 0.86 * W;
    } else {
      ctx.font = `500 ${fontSize}px "Cormorant Garamond", Georgia, serif`;
      const priceW = it.price ? ctx.measureText(it.price).width : 0;
      ctx.font = `italic 500 ${fontSize}px "Cormorant Garamond", Georgia, serif`;
      nameMaxW = Rx - Lx - (priceW ? priceW + 0.02 * W : 0);
    }
    const lines = wrapText(ctx, it.name, nameMaxW);
    total += lines.length * lineH + itemGap;
  }
  return total;
}

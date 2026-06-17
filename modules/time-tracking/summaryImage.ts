import type { WeeklyResult } from "./types";
import { DAY_NAMES, formatHours, formatMoney, weekLabel } from "./utils";

interface ImageOptions {
  businessName: string;
  brandColor: string;
  currency: string;
}

/**
 * Dibuja un parte semanal DETALLADO en un canvas y devuelve el dataURL PNG:
 * por cada día muestra las entradas/salidas reales y marca las jornadas
 * partidas. Render local (sin red): apto para descargar o compartir.
 */
export function renderWeeklySummary(
  result: WeeklyResult,
  opts: ImageOptions
): string {
  const W = 780;
  const headerH = 110;
  const empH = 76;
  const daysTitleH = 30;

  // Altura variable según nº de tramos por día.
  const rowHeights = result.days.map(
    (d) => Math.max(1, d.segments.length) * 26 + 16
  );
  const daysH = rowHeights.reduce((a, b) => a + b, 0);
  const totalsH = 3 * 32 + 16;
  const payH = 116;
  const footerH = 46;
  const H = headerH + empH + daysTitleH + daysH + totalsH + payH + footerH;

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // Fondo
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Cabecera
  ctx.fillStyle = opts.brandColor;
  ctx.fillRect(0, 0, W, headerH);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.fillText(opts.businessName, 32, 48);
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("Parte semanal de jornada", 32, 78);

  // Datos del empleado
  let y = headerH + 34;
  ctx.fillStyle = "#111827";
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillText(result.employee.name, 32, y);
  ctx.fillStyle = "#6b7280";
  ctx.font = "15px Arial, sans-serif";
  ctx.fillText(result.employee.position || "—", 32, y + 22);
  ctx.textAlign = "right";
  ctx.fillStyle = "#111827";
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText(weekLabel(result.weekStart), W - 32, y);
  ctx.textAlign = "left";

  // Título sección
  y = headerH + empH;
  ctx.fillStyle = "#9ca3af";
  ctx.font = "bold 12px Arial, sans-serif";
  ctx.fillText("DÍA", 44, y + 20);
  ctx.fillText("ENTRADAS / SALIDAS", 130, y + 20);
  ctx.textAlign = "right";
  ctx.fillText("TOTAL", W - 44, y + 20);
  ctx.textAlign = "left";

  // Filas por día
  y = headerH + empH + daysTitleH;
  result.days.forEach((day, i) => {
    const rh = rowHeights[i];
    if (i % 2 === 0) {
      ctx.fillStyle = "#f9fafb";
      ctx.fillRect(32, y, W - 64, rh);
    }
    const midY = y + rh / 2 + 5;

    // Nombre del día
    ctx.fillStyle = day.total > 0 ? "#111827" : "#9ca3af";
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.fillText(DAY_NAMES[day.dayIndex], 44, midY);

    // Tramos
    if (day.segments.length === 0) {
      ctx.fillStyle = "#9ca3af";
      ctx.font = "15px Arial, sans-serif";
      ctx.fillText("Descanso", 130, midY);
    } else {
      ctx.font = "15px Arial, sans-serif";
      day.segments.forEach((seg, si) => {
        const lineY = y + 24 + si * 26;
        ctx.fillStyle = "#374151";
        ctx.fillText(`${seg.start} – ${seg.end}`, 130, lineY);
        ctx.fillStyle = "#9ca3af";
        ctx.font = "13px Arial, sans-serif";
        ctx.fillText(formatHours(seg.net), 270, lineY);
        ctx.font = "15px Arial, sans-serif";
      });
      // Etiqueta de jornada partida
      if (day.isSplit) {
        const tag = "PARTIDA";
        ctx.font = "bold 11px Arial, sans-serif";
        const tw = ctx.measureText(tag).width + 14;
        const tagX = 360;
        const tagY = midY - 13;
        ctx.fillStyle = opts.brandColor;
        roundRect(ctx, tagX, tagY, tw, 18, 9);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText(tag, tagX + 7, tagY + 13);
      }
    }

    // Total del día
    ctx.textAlign = "right";
    ctx.fillStyle = day.total > 0 ? "#111827" : "#9ca3af";
    ctx.font = day.total > 0 ? "bold 16px Arial, sans-serif" : "16px Arial, sans-serif";
    ctx.fillText(day.total > 0 ? formatHours(day.total) : "—", W - 44, midY);
    ctx.textAlign = "left";

    y += rh;
  });

  // Totales
  y += 14;
  const lines: [string, string, string?][] = [
    ["Horas trabajadas", formatHours(result.totalHours)],
    ["Horas por contrato", formatHours(result.employee.contractHours)],
    ["Horas extra", formatHours(result.extraHours), opts.brandColor],
  ];
  ctx.font = "17px Arial, sans-serif";
  lines.forEach(([label, val, color], i) => {
    const rowY = y + i * 32;
    ctx.fillStyle = "#374151";
    ctx.font = "17px Arial, sans-serif";
    ctx.fillText(label, 44, rowY);
    ctx.textAlign = "right";
    ctx.fillStyle = color ?? "#111827";
    ctx.font = "bold 17px Arial, sans-serif";
    ctx.fillText(val, W - 44, rowY);
    ctx.textAlign = "left";
  });

  // Caja de pago
  const boxY = y + 3 * 32;
  ctx.fillStyle = opts.brandColor;
  roundRect(ctx, 32, boxY, W - 64, 96, 12);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "15px Arial, sans-serif";
  ctx.fillText(
    `Pago horas extra (${formatHours(result.extraHours)} × ${formatMoney(
      result.employee.extraHourPrice,
      opts.currency
    )})`,
    56,
    boxY + 32
  );
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.fillText("TOTAL A PAGAR", 56, boxY + 70);
  ctx.textAlign = "right";
  ctx.font = "bold 30px Arial, sans-serif";
  ctx.fillText(formatMoney(result.totalPay, opts.currency), W - 56, boxY + 72);
  ctx.textAlign = "left";

  // Pie
  ctx.fillStyle = "#9ca3af";
  ctx.font = "13px Arial, sans-serif";
  ctx.fillText(`Generado el ${new Date().toLocaleString()} · Espou Manager`, 32, H - 18);

  return canvas.toDataURL("image/png");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Descarga un dataURL como archivo PNG. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

import type { WeeklyResult } from "./types";
import { DAY_NAMES, formatHours, formatMoney, weekLabel } from "./utils";

interface ImageOptions {
  businessName: string;
  brandColor: string;
  currency: string;
}

/**
 * Dibuja el resumen semanal en un canvas y devuelve el dataURL PNG.
 * Todo el render es local (sin red): apto para descargar o compartir.
 */
export function renderWeeklySummary(
  result: WeeklyResult,
  opts: ImageOptions
): string {
  const W = 720;
  const H = 760;
  const canvas = document.createElement("canvas");
  const scale = 2; // nitidez en pantallas retina
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // Fondo
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Cabecera
  ctx.fillStyle = opts.brandColor;
  ctx.fillRect(0, 0, W, 96);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.fillText(opts.businessName, 32, 44);
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("Resumen semanal de jornada", 32, 72);

  // Datos del empleado
  let y = 140;
  ctx.fillStyle = "#111827";
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillText(result.employee.name, 32, y);
  ctx.fillStyle = "#6b7280";
  ctx.font = "15px Arial, sans-serif";
  ctx.fillText(result.employee.position || "—", 32, y + 24);
  ctx.textAlign = "right";
  ctx.fillStyle = "#111827";
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText(weekLabel(result.weekStart), W - 32, y);
  ctx.textAlign = "left";

  // Tabla de días
  y = 210;
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  result.perDay.forEach((hours, i) => {
    const rowY = y + i * 44;
    if (i % 2 === 0) {
      ctx.fillStyle = "#f9fafb";
      ctx.fillRect(32, rowY - 26, W - 64, 40);
    }
    ctx.fillStyle = "#374151";
    ctx.font = "16px Arial, sans-serif";
    ctx.fillText(DAY_NAMES[i], 48, rowY);
    ctx.textAlign = "right";
    ctx.fillStyle = hours > 0 ? "#111827" : "#9ca3af";
    ctx.font = hours > 0 ? "bold 16px Arial, sans-serif" : "16px Arial, sans-serif";
    ctx.fillText(hours > 0 ? formatHours(hours) : "—", W - 48, rowY);
    ctx.textAlign = "left";
  });

  // Totales
  y = 210 + 7 * 44 + 24;
  const lines: [string, string, string?][] = [
    ["Horas trabajadas", formatHours(result.totalHours)],
    ["Horas por contrato", formatHours(result.employee.contractHours)],
    ["Horas extra", formatHours(result.extraHours), opts.brandColor],
  ];
  ctx.font = "17px Arial, sans-serif";
  lines.forEach(([label, val, color], i) => {
    const rowY = y + i * 34;
    ctx.fillStyle = "#374151";
    ctx.fillText(label, 48, rowY);
    ctx.textAlign = "right";
    ctx.fillStyle = color ?? "#111827";
    ctx.font = "bold 17px Arial, sans-serif";
    ctx.fillText(val, W - 48, rowY);
    ctx.font = "17px Arial, sans-serif";
    ctx.textAlign = "left";
  });

  // Caja de pago
  const boxY = y + 3 * 34 + 16;
  ctx.fillStyle = opts.brandColor;
  ctx.fillRect(32, boxY, W - 64, 110);
  ctx.fillStyle = "#ffffff";
  ctx.font = "15px Arial, sans-serif";
  ctx.fillText(
    `Pago horas extra (${formatHours(result.extraHours)} × ${formatMoney(
      result.employee.extraHourPrice,
      opts.currency
    )})`,
    56,
    boxY + 34
  );
  ctx.textAlign = "right";
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText(formatMoney(result.extraPay, opts.currency), W - 56, boxY + 34);

  ctx.textAlign = "left";
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.fillText("TOTAL A PAGAR", 56, boxY + 80);
  ctx.textAlign = "right";
  ctx.font = "bold 30px Arial, sans-serif";
  ctx.fillText(formatMoney(result.totalPay, opts.currency), W - 56, boxY + 82);
  ctx.textAlign = "left";

  // Pie
  ctx.fillStyle = "#9ca3af";
  ctx.font = "13px Arial, sans-serif";
  ctx.fillText(
    `Generado el ${new Date().toLocaleDateString()} · Espou Manager`,
    32,
    H - 24
  );

  return canvas.toDataURL("image/png");
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

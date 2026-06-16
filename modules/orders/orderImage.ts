import type { Order, Product, Supplier } from "./types";
import { formatDate } from "./utils";

interface ImageOptions {
  businessName: string;
  brandColor: string;
}

/** Renderiza el pedido como PNG y devuelve el dataURL. */
export function renderOrderImage(
  order: Order,
  supplier: Supplier,
  products: Product[],
  opts: ImageOptions
): string {
  const rows = order.lines
    .filter((l) => l.qty > 0)
    .map((l) => {
      const p = products.find((x) => x.id === l.productId);
      return { name: p?.name ?? "—", unit: p?.unit ?? "", qty: l.qty };
    });

  const W = 720;
  const rowH = 38;
  const headerH = 110;
  const infoH = 70;
  const tableHeadY = headerH + infoH;
  const tableH = 34 + rows.length * rowH;
  const footerH = 110;
  const H = tableHeadY + tableH + footerH;

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
  ctx.font = "bold 24px Arial, sans-serif";
  ctx.fillText(opts.businessName, 32, 44);
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("Pedido a proveedor", 32, 72);

  // Info proveedor
  let y = headerH + 32;
  ctx.fillStyle = "#111827";
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText(supplier.name, 32, y);
  ctx.textAlign = "right";
  ctx.fillStyle = "#6b7280";
  ctx.font = "14px Arial, sans-serif";
  ctx.fillText(`Fecha: ${formatDate(order.createdAt)}`, W - 32, y - 16);
  if (supplier.phone) ctx.fillText(`Tel: ${supplier.phone}`, W - 32, y + 4);
  ctx.textAlign = "left";

  // Cabecera de tabla
  y = tableHeadY;
  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(32, y, W - 64, 34);
  ctx.fillStyle = "#374151";
  ctx.font = "bold 14px Arial, sans-serif";
  ctx.fillText("PRODUCTO", 44, y + 22);
  ctx.textAlign = "right";
  ctx.fillText("CANT.", W - 150, y + 22);
  ctx.textAlign = "left";
  ctx.fillText("UNIDAD", W - 120, y + 22);

  // Filas
  y += 34;
  ctx.font = "15px Arial, sans-serif";
  rows.forEach((r, i) => {
    const rowY = y + i * rowH;
    if (i % 2 === 1) {
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(32, rowY, W - 64, rowH);
    }
    ctx.fillStyle = "#111827";
    ctx.fillText(r.name, 44, rowY + 24);
    ctx.textAlign = "right";
    ctx.font = "bold 15px Arial, sans-serif";
    ctx.fillText(String(r.qty), W - 150, rowY + 24);
    ctx.font = "15px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#6b7280";
    ctx.fillText(r.unit, W - 120, rowY + 24);
  });

  // Totales
  y = tableHeadY + tableH + 24;
  ctx.strokeStyle = "#e5e7eb";
  ctx.beginPath();
  ctx.moveTo(32, y - 16);
  ctx.lineTo(W - 32, y - 16);
  ctx.stroke();
  ctx.fillStyle = "#111827";
  ctx.font = "bold 16px Arial, sans-serif";
  const totalUnits = rows.reduce((a, r) => a + r.qty, 0);
  ctx.fillText(`${rows.length} referencias · ${totalUnits} unidades`, 32, y + 8);

  if (order.note) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "14px Arial, sans-serif";
    ctx.fillText(`Nota: ${order.note}`, 32, y + 34);
  }

  // Pie
  ctx.fillStyle = "#9ca3af";
  ctx.font = "12px Arial, sans-serif";
  ctx.fillText(`Generado el ${new Date().toLocaleDateString()} · Espou Manager`, 32, H - 18);

  return canvas.toDataURL("image/png");
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

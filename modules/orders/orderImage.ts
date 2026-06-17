import type { Order, Product, Supplier } from "./types";
import { currencySymbol, formatDate, formatRef, orderTotal } from "./utils";

interface ImageOptions {
  businessName: string;
  brandColor: string;
  currency: string;
}

/** Renderiza el pedido como PNG (con precios y total) y devuelve el dataURL. */
export function renderOrderImage(
  order: Order,
  supplier: Supplier,
  products: Product[],
  opts: ImageOptions
): string {
  const sym = currencySymbol(opts.currency);
  const rows = order.lines
    .filter((l) => l.qty > 0)
    .map((l) => {
      const p = products.find((x) => x.id === l.productId);
      const price = p?.price ?? 0;
      return { name: p?.name ?? "—", unit: p?.unit ?? "", qty: l.qty, price, subtotal: price * l.qty };
    });

  const W = 760;
  const rowH = 38;
  const headerH = 110;
  const infoH = 78;
  const tableHeadY = headerH + infoH;
  const tableH = 34 + rows.length * rowH;
  const footerH = 130;
  const H = tableHeadY + tableH + footerH;

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Cabecera
  ctx.fillStyle = opts.brandColor;
  ctx.fillRect(0, 0, W, headerH);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px Arial, sans-serif";
  ctx.fillText(`Pedido ${formatRef(order.reference)}`, 32, 44);
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText(opts.businessName, 32, 74);

  // Info proveedor
  let y = headerH + 32;
  ctx.fillStyle = "#111827";
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText(supplier.name, 32, y);
  ctx.textAlign = "right";
  ctx.fillStyle = "#6b7280";
  ctx.font = "14px Arial, sans-serif";
  ctx.fillText(`Fecha: ${formatDate(order.createdAt)}`, W - 32, y - 18);
  if (order.expectedDate) ctx.fillText(`Entrega: ${formatDate(order.expectedDate)}`, W - 32, y);
  if (supplier.phone) ctx.fillText(`Tel: ${supplier.phone}`, W - 32, y + 18);
  ctx.textAlign = "left";

  // Cabecera de tabla
  y = tableHeadY;
  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(32, y, W - 64, 34);
  ctx.fillStyle = "#374151";
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.fillText("PRODUCTO", 44, y + 22);
  ctx.textAlign = "right";
  ctx.fillText("CANT.", W - 320, y + 22);
  ctx.textAlign = "left";
  ctx.fillText("UD", W - 300, y + 22);
  ctx.textAlign = "right";
  ctx.fillText("PRECIO", W - 170, y + 22);
  ctx.fillText("SUBTOTAL", W - 44, y + 22);
  ctx.textAlign = "left";

  // Filas
  y += 34;
  ctx.font = "14px Arial, sans-serif";
  rows.forEach((r, i) => {
    const rowY = y + i * rowH;
    if (i % 2 === 1) {
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(32, rowY, W - 64, rowH);
    }
    ctx.fillStyle = "#111827";
    ctx.fillText(truncate(ctx, r.name, W - 380), 44, rowY + 24);
    ctx.textAlign = "right";
    ctx.font = "bold 14px Arial, sans-serif";
    ctx.fillText(String(r.qty), W - 320, rowY + 24);
    ctx.font = "13px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#6b7280";
    ctx.fillText(r.unit, W - 300, rowY + 24);
    ctx.textAlign = "right";
    ctx.fillText(r.price ? `${r.price.toFixed(2)} ${sym}` : "—", W - 170, rowY + 24);
    ctx.fillStyle = "#111827";
    ctx.font = "14px Arial, sans-serif";
    ctx.fillText(r.subtotal ? `${r.subtotal.toFixed(2)} ${sym}` : "—", W - 44, rowY + 24);
    ctx.textAlign = "left";
  });

  // Totales
  y = tableHeadY + tableH + 22;
  ctx.strokeStyle = "#e5e7eb";
  ctx.beginPath();
  ctx.moveTo(32, y - 14);
  ctx.lineTo(W - 32, y - 14);
  ctx.stroke();
  const total = orderTotal(order, products);
  const units = rows.reduce((a, r) => a + r.qty, 0);
  ctx.fillStyle = "#6b7280";
  ctx.font = "14px Arial, sans-serif";
  ctx.fillText(`${rows.length} referencias · ${units} unidades`, 32, y + 8);
  ctx.textAlign = "right";
  ctx.fillStyle = "#111827";
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillText(`Total: ${total.toFixed(2)} ${sym}`, W - 32, y + 12);
  ctx.textAlign = "left";

  if (order.note) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "14px Arial, sans-serif";
    ctx.fillText(`Nota: ${truncate(ctx, order.note, W - 80)}`, 32, y + 40);
  }

  ctx.fillStyle = "#9ca3af";
  ctx.font = "12px Arial, sans-serif";
  ctx.fillText(`Generado el ${new Date().toLocaleDateString()} · Espou Manager`, 32, H - 18);

  return canvas.toDataURL("image/png");
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

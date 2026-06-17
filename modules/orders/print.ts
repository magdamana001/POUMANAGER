import type { Order, Product, Supplier } from "./types";
import { currencySymbol, formatDate, formatRef, orderTotal } from "./utils";

interface PrintContext {
  businessName: string;
  products: Product[];
  currency: string;
}

/**
 * Abre una ventana con el pedido resumido y lanza el diálogo de impresión.
 * Render aislado para no interferir con el layout de la app.
 */
export function printOrder(
  order: Order,
  supplier: Supplier,
  ctx: PrintContext
): void {
  const sym = currencySymbol(ctx.currency);
  const rows = order.lines
    .filter((l) => l.qty > 0)
    .map((l) => {
      const p = ctx.products.find((x) => x.id === l.productId);
      const price = p?.price ?? 0;
      return {
        name: p?.name ?? "—",
        unit: p?.unit ?? "",
        qty: l.qty,
        price,
        subtotal: price * l.qty,
      };
    });

  const rowsHtml = rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.name)}</td>
        <td style="text-align:right;font-weight:bold">${r.qty}</td>
        <td>${escapeHtml(r.unit)}</td>
        <td style="text-align:right">${r.price ? r.price.toFixed(2) + " " + sym : "—"}</td>
        <td style="text-align:right">${r.subtotal ? r.subtotal.toFixed(2) + " " + sym : "—"}</td>
      </tr>`
    )
    .join("");

  const total = orderTotal(order, ctx.products);
  const units = rows.reduce((a, r) => a + r.qty, 0);

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <title>Pedido ${formatRef(order.reference)} ${escapeHtml(supplier.name)}</title>
  <style>
    *{font-family:Arial,Helvetica,sans-serif;color:#111}
    body{margin:32px;max-width:640px}
    h1{font-size:20px;margin:0}
    .muted{color:#666;font-size:13px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th,td{padding:8px 6px;border-bottom:1px solid #ddd;font-size:14px}
    th{text-align:left;background:#f3f3f3}
    .total{margin-top:16px;font-size:15px;text-align:right}
    .total strong{font-size:18px}
    @media print{button{display:none}}
  </style></head><body>
    <div class="head">
      <div>
        <h1>Pedido ${formatRef(order.reference)} · ${escapeHtml(supplier.name)}</h1>
        <div class="muted">${escapeHtml(ctx.businessName)}</div>
      </div>
      <div class="muted" style="text-align:right">
        Fecha: ${formatDate(order.createdAt)}<br>
        ${order.expectedDate ? "Entrega prevista: " + formatDate(order.expectedDate) + "<br>" : ""}
        ${supplier.phone ? "Tel: " + escapeHtml(supplier.phone) : ""}
      </div>
    </div>
    <table>
      <thead><tr><th>Producto</th><th style="text-align:right">Cant.</th><th>Unidad</th><th style="text-align:right">Precio</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>${rowsHtml || '<tr><td colspan="5">Sin líneas</td></tr>'}</tbody>
    </table>
    <div class="total">
      ${rows.length} referencias · ${units} unidades<br>
      <strong>Total: ${total.toFixed(2)} ${sym}</strong>
    </div>
    ${order.note ? `<p class="muted">Nota: ${escapeHtml(order.note)}</p>` : ""}
    <button onclick="window.print()" style="margin-top:24px;padding:10px 16px">Imprimir</button>
  </body></html>`;

  const w = window.open("", "_blank", "width=760,height=900");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

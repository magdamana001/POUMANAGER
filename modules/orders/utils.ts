export const WEEKDAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
export const WEEKDAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Índice de día de semana (0=Lun … 6=Dom) de una fecha ISO. */
export function weekdayIndex(iso: string): number {
  return (new Date(iso + "T00:00:00").getDay() + 6) % 7;
}

export function todayWeekdayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

/** Días que faltan desde hoy hasta la fecha dada (negativo si pasó). */
export function daysUntil(iso: string): number {
  const a = new Date(todayISO() + "T00:00:00").getTime();
  const b = new Date(iso + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

import type { Order, Product, Supplier } from "./types";

export function currencySymbol(currency: string): string {
  return { EUR: "€", USD: "$", GBP: "£" }[currency] ?? currency;
}

export function formatMoney(amount: number, currency: string): string {
  return `${(amount ?? 0).toFixed(2)} ${currencySymbol(currency)}`;
}

/** Subtotal de una línea (cantidad × precio del producto). */
export function lineSubtotal(qty: number, product?: Product): number {
  return qty * (product?.price ?? 0);
}

/** Total económico del pedido (sobre lo pedido). */
export function orderTotal(order: Order, products: Product[]): number {
  return order.lines.reduce((sum, l) => {
    const p = products.find((x) => x.id === l.productId);
    return sum + l.qty * (p?.price ?? 0);
  }, 0);
}

/** Nº total de unidades del pedido. */
export function orderUnits(order: Order): number {
  return order.lines.reduce((a, l) => a + l.qty, 0);
}

/** Siguiente número de pedido correlativo. */
export function nextReference(orders: Order[]): number {
  return orders.reduce((max, o) => Math.max(max, o.reference ?? 0), 0) + 1;
}

/** Formatea el número de pedido como #0001. */
export function formatRef(ref?: number): string {
  return `#${String(ref ?? 0).padStart(4, "0")}`;
}

/** ¿La fecha pertenece al mes actual? */
export function isThisMonth(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso + "T00:00:00");
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

/** ¿El producto está bajo mínimos (punto de pedido)? */
export function isLowStock(p: Product): boolean {
  return (p.minStock ?? 0) > 0 && (p.stock ?? 0) <= (p.minStock ?? 0);
}

/** Cantidad sugerida para reponer hasta el mínimo. */
export function suggestedQty(p: Product): number {
  const need = (p.minStock ?? 0) - (p.stock ?? 0);
  return Math.max(1, Math.ceil(need));
}

/** Construye el texto del pedido para enviar por WhatsApp. */
export function buildOrderMessage(
  order: Order,
  supplier: Supplier,
  products: Product[],
  businessName: string,
  currency: string
): string {
  const lines = order.lines
    .filter((l) => l.qty > 0)
    .map((l) => {
      const p = products.find((x) => x.id === l.productId);
      return `• ${l.qty} ${p?.unit ?? ""} ${p?.name ?? ""}`.trim();
    });
  const total = orderTotal(order, products);
  return (
    `*Pedido ${formatRef(order.reference)}* — ${businessName}\n` +
    `Proveedor: ${supplier.name}\n` +
    `Fecha: ${formatDate(order.createdAt)}\n\n` +
    `${lines.join("\n")}\n\n` +
    `Total estimado: ${formatMoney(total, currency)}` +
    (order.note ? `\nNota: ${order.note}` : "")
  );
}

/** URL de WhatsApp con el mensaje precargado. */
export function whatsappUrl(phone: string, text: string): string {
  const clean = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

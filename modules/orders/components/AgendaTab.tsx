"use client";

import { useOrders } from "../store";
import type { Order } from "../types";
import { daysUntil, formatDate, todayWeekdayIndex, WEEKDAYS } from "../utils";

export function AgendaTab() {
  const { suppliers, orders, saveOrder } = useOrders();
  const today = todayWeekdayIndex();

  const todaySuppliers = suppliers.filter((s) => s.visitDays.includes(today));
  const pending = orders
    .filter((o) => o.status === "enviado")
    .sort((a, b) => (a.expectedDate ?? "") < (b.expectedDate ?? "") ? -1 : 1);

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "—";
  const supplierColor = (id: string) => suppliers.find((s) => s.id === id)?.color ?? "#999";

  const alertInfo = (o: Order) => {
    if (!o.expectedDate) return { label: "Sin fecha", cls: "bg-neutral-100 text-neutral-600" };
    const d = daysUntil(o.expectedDate);
    if (d < 0) return { label: `Atrasado ${-d}d`, cls: "bg-red-100 text-red-700" };
    if (d === 0) return { label: "¡Llega hoy!", cls: "bg-amber-100 text-amber-800" };
    if (d === 1) return { label: "Mañana", cls: "bg-blue-100 text-blue-700" };
    return { label: `En ${d} días`, cls: "bg-neutral-100 text-neutral-600" };
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Visitas de hoy */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-semibold">Hoy — {WEEKDAYS[today]}</h2>
        <p className="mb-4 text-sm text-neutral-500">Proveedores que vienen a tomar pedido.</p>
        {todaySuppliers.length === 0 ? (
          <p className="text-sm text-neutral-400">Hoy no viene ningún proveedor.</p>
        ) : (
          <ul className="space-y-2">
            {todaySuppliers.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-lg bg-brand-soft px-3 py-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="flex-1 font-medium">{s.name}</span>
                {s.phone && <span className="text-sm text-neutral-500">{s.phone}</span>}
              </li>
            ))}
          </ul>
        )}

        <h3 className="mb-2 mt-6 text-sm font-medium text-neutral-500">Resto de la semana</h3>
        <div className="space-y-1">
          {WEEKDAYS.map((d, i) => {
            const list = suppliers.filter((s) => s.visitDays.includes(i));
            if (list.length === 0) return null;
            return (
              <div key={i} className={`flex gap-2 rounded px-2 py-1 text-sm ${i === today ? "font-semibold" : ""}`}>
                <span className="w-24 shrink-0 text-neutral-500">{d}</span>
                <span className="text-neutral-700">{list.map((s) => s.name).join(", ")}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alertas de recepción */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-semibold">Pedidos por recibir</h2>
        <p className="mb-4 text-sm text-neutral-500">Pedidos enviados a la espera de entrega.</p>
        {pending.length === 0 ? (
          <p className="text-sm text-neutral-400">No hay pedidos pendientes de recibir.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((o) => {
              const info = alertInfo(o);
              return (
                <li key={o.id} className="flex items-center gap-3 rounded-lg border border-neutral-100 p-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: supplierColor(o.supplierId) }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{supplierName(o.supplierId)}</p>
                    <p className="text-xs text-neutral-500">Previsto: {formatDate(o.expectedDate ?? "")}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${info.cls}`}>{info.label}</span>
                  <button
                    onClick={() => saveOrder({ ...o, status: "recibido" })}
                    className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
                  >
                    Recibido
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

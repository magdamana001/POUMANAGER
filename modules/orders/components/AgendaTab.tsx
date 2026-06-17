"use client";

import { useMemo } from "react";
import { useConfig } from "@/core/config/ConfigProvider";
import { useOrders } from "../store";
import type { Order, Product } from "../types";
import { SupplierAvatar } from "./ui";
import {
  addDays,
  daysUntil,
  formatDate,
  formatMoney,
  formatRef,
  isLowStock,
  isThisMonth,
  orderTotal,
  todayISO,
  todayWeekdayIndex,
  WEEKDAYS,
  WEEKDAYS_SHORT,
} from "../utils";

export function AgendaTab() {
  const { config } = useConfig();
  const currency = config.general.currency;
  const { suppliers, products, orders } = useOrders();
  const today = todayWeekdayIndex();
  const weekStart = addDays(todayISO(), -today); // lunes de esta semana

  const pending = useMemo(
    () =>
      orders
        .filter((o) => o.status === "enviado")
        .sort((a, b) => ((a.expectedDate ?? "") < (b.expectedDate ?? "") ? -1 : 1)),
    [orders]
  );
  const lowStock = useMemo(() => products.filter(isLowStock), [products]);
  const overdue = pending.filter((o) => o.expectedDate && daysUntil(o.expectedDate) < 0).length;
  const monthSpend = orders
    .filter((o) => isThisMonth(o.createdAt))
    .reduce((a, o) => a + orderTotal(o, products), 0);
  const todaySuppliers = suppliers.filter((s) => s.visitDays.includes(today));

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "—";
  const supplierColor = (id: string) => suppliers.find((s) => s.id === id)?.color ?? "#999";

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon="🚚" label="Proveedores hoy" value={String(todaySuppliers.length)} hint={WEEKDAYS[today]} />
        <Kpi icon="📦" label="Pedidos por recibir" value={String(pending.length)} hint={overdue > 0 ? `${overdue} atrasados` : "al día"} accent={overdue > 0 ? "red" : "blue"} />
        <Kpi icon="⚠️" label="Bajo mínimo" value={String(lowStock.length)} hint={lowStock.length ? "requiere pedido" : "stock ok"} accent={lowStock.length ? "red" : "green"} />
        <Kpi icon="💶" label="Gasto del mes" value={formatMoney(monthSpend, currency)} hint="pedidos creados" accent="brand" />
      </div>

      {/* Planificador semanal de visitas */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Planificador semanal de visitas</h2>
          <span className="text-xs text-neutral-400">Proveedores que vienen a tomar pedido</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {WEEKDAYS_SHORT.map((d, i) => {
            const list = suppliers.filter((s) => s.visitDays.includes(i));
            const isToday = i === today;
            const dayDate = addDays(weekStart, i);
            return (
              <div
                key={i}
                className={`flex flex-col rounded-xl border p-2.5 ${isToday ? "border-brand bg-brand-soft" : "border-neutral-200 bg-neutral-50"}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isToday ? "text-brand" : "text-neutral-600"}`}>{d}</span>
                  <span className="text-[10px] text-neutral-400">{formatDate(dayDate).slice(0, 5)}</span>
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  {list.length === 0 ? (
                    <span className="text-[11px] text-neutral-300">—</span>
                  ) : (
                    list.map((s) => (
                      <div key={s.id} className="flex items-center gap-1.5" title={s.name}>
                        <SupplierAvatar name={s.name} color={s.color} size={20} />
                        <span className="truncate text-[11px] text-neutral-700">{s.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recepciones pendientes */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 font-semibold">Pedidos por recibir</h2>
          <p className="mb-4 text-sm text-neutral-500">Enviados a la espera de entrega.</p>
          {pending.length === 0 ? (
            <Empty>No hay pedidos pendientes de recibir.</Empty>
          ) : (
            <ul className="space-y-2">
              {pending.map((o) => {
                const info = alertInfo(o);
                return (
                  <li key={o.id} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2.5">
                    <SupplierAvatar name={supplierName(o.supplierId)} color={supplierColor(o.supplierId)} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        <span className="text-xs text-neutral-400">{formatRef(o.reference)} </span>
                        {supplierName(o.supplierId)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatDate(o.expectedDate ?? "")} · {formatMoney(orderTotal(o, products), currency)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${info.cls}`}>{info.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Stock bajo mínimo */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 font-semibold">Reposición necesaria</h2>
          <p className="mb-4 text-sm text-neutral-500">Productos en el punto de pedido o por debajo.</p>
          {lowStock.length === 0 ? (
            <Empty>Todo el stock está por encima del mínimo. 👍</Empty>
          ) : (
            <ul className="space-y-2.5">
              {lowStock.map((p) => (
                <LowStockRow key={p.id} product={p} color={supplierColor(p.supplierId)} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function alertInfo(o: Order) {
  if (!o.expectedDate) return { label: "Sin fecha", cls: "bg-neutral-100 text-neutral-600" };
  const d = daysUntil(o.expectedDate);
  if (d < 0) return { label: `Atrasado ${-d}d`, cls: "bg-red-100 text-red-700" };
  if (d === 0) return { label: "¡Llega hoy!", cls: "bg-amber-100 text-amber-800" };
  if (d === 1) return { label: "Mañana", cls: "bg-blue-100 text-blue-700" };
  return { label: `En ${d} días`, cls: "bg-neutral-100 text-neutral-600" };
}

function LowStockRow({ product, color }: { product: Product; color: string }) {
  const min = product.minStock ?? 0;
  const stock = product.stock ?? 0;
  const pct = min > 0 ? Math.min(100, Math.round((stock / min) * 100)) : 0;
  return (
    <li className="rounded-xl border border-red-100 bg-red-50/50 p-2.5">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{product.name}</span>
        <span className="shrink-0 text-xs font-semibold text-red-700">
          {stock}/{min} {product.unit}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-red-100">
        <div className="h-full rounded-full bg-red-500" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-400">
      {children}
    </p>
  );
}

const ACCENT: Record<string, string> = {
  brand: "text-brand",
  red: "text-red-600",
  green: "text-green-600",
  blue: "text-blue-600",
};

function Kpi({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  accent?: "brand" | "red" | "green" | "blue";
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${accent ? ACCENT[accent] : "text-neutral-900"}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

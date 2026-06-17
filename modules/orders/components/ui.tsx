"use client";

import type { OrderStatus } from "../types";

/** Clase de input estándar del módulo. */
export const inputCls =
  "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none";

/** Avatar circular del proveedor (inicial sobre su color). */
export function SupplierAvatar({ name, color, size = 36 }: { name: string; color?: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ backgroundColor: color ?? "#999", width: size, height: size, fontSize: size * 0.4 }}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

const STATUS: Record<OrderStatus, { label: string; cls: string; dot: string }> = {
  borrador: { label: "Borrador", cls: "bg-neutral-100 text-neutral-600", dot: "bg-neutral-400" },
  enviado: { label: "Enviado", cls: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  recibido: { label: "Recibido", cls: "bg-green-50 text-green-700", dot: "bg-green-500" },
};

/** Pill de estado con punto de color. */
export function StatusPill({ status }: { status: OrderStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

/** Control de cantidad con botones − / +. */
export function Stepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const btn =
    "flex h-9 w-9 items-center justify-center text-lg text-neutral-600 transition hover:bg-neutral-100 active:bg-neutral-200 disabled:opacity-30";
  return (
    <div className="inline-flex items-center overflow-hidden rounded-xl border border-neutral-300 bg-white shadow-sm">
      <button type="button" className={btn} onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} aria-label="Restar">
        −
      </button>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        className="h-9 w-12 border-x border-neutral-200 text-center text-sm focus:outline-none"
        value={value || ""}
        placeholder="0"
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
      />
      <button type="button" className={btn} onClick={() => onChange(value + 1)} aria-label="Sumar">
        +
      </button>
    </div>
  );
}

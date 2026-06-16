"use client";

import { useMemo, useState } from "react";
import { useConfig } from "@/core/config/ConfigProvider";
import { useOrders } from "../store";
import type { Order, OrderStatus } from "../types";
import { printOrder } from "../print";
import { renderOrderImage, downloadDataUrl } from "../orderImage";
import { addDays, formatDate, todayISO, uid } from "../utils";

const STATUS_STYLE: Record<OrderStatus, string> = {
  borrador: "bg-neutral-200 text-neutral-700",
  enviado: "bg-blue-100 text-blue-700",
  recibido: "bg-green-100 text-green-700",
};

export function OrdersTab() {
  const { config } = useConfig();
  const { suppliers, products, orders, saveOrder, removeOrder } = useOrders();
  const [editing, setEditing] = useState<Order | null>(null);
  const [verifying, setVerifying] = useState<Order | null>(null);

  const sorted = useMemo(
    () => [...orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [orders]
  );

  const supplier = (id: string) => suppliers.find((s) => s.id === id);
  const itemCount = (o: Order) => o.lines.filter((l) => l.qty > 0).length;

  const newOrder = () => {
    if (!suppliers[0]) return;
    setEditing({
      id: uid(),
      supplierId: suppliers[0].id,
      createdAt: todayISO(),
      status: "borrador",
      lines: [],
      note: "",
    });
  };

  const markSent = (o: Order) => {
    const s = supplier(o.supplierId);
    saveOrder({
      ...o,
      status: "enviado",
      sentAt: todayISO(),
      expectedDate: addDays(todayISO(), s?.leadDays ?? 1),
    });
  };

  const downloadImage = (o: Order) => {
    const s = supplier(o.supplierId);
    if (!s) return;
    const dataUrl = renderOrderImage(o, s, products, {
      businessName: config.general.businessName,
      brandColor: config.general.brandColor,
    });
    downloadDataUrl(dataUrl, `pedido_${s.name.replace(/\s+/g, "_")}_${o.createdAt}.png`);
  };

  if (suppliers.length === 0) {
    return <p className="text-sm text-neutral-400">Primero crea proveedores y productos.</p>;
  }

  if (editing) {
    return (
      <OrderEditor
        order={editing}
        onCancel={() => setEditing(null)}
        onSave={(o) => {
          saveOrder(o);
          setEditing(null);
        }}
      />
    );
  }

  if (verifying) {
    return (
      <ReceptionView
        order={verifying}
        onCancel={() => setVerifying(null)}
        onSave={(o) => {
          saveOrder(o);
          setVerifying(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={newOrder} className="rounded-lg bg-brand px-5 py-2 font-medium text-white hover:opacity-90">
        + Nuevo pedido
      </button>

      {sorted.length === 0 ? (
        <p className="text-sm text-neutral-400">No hay pedidos todavía.</p>
      ) : (
        sorted.map((o) => {
          const s = supplier(o.supplierId);
          return (
            <div key={o.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s?.color }} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s?.name ?? "—"}</p>
                  <p className="text-xs text-neutral-500">
                    {formatDate(o.createdAt)} · {itemCount(o)} referencias
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[o.status]}`}>
                  {o.status}
                </span>
              </div>

              {o.status === "enviado" && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm">
                  <span className="text-blue-800">Recepción prevista:</span>
                  <input
                    type="date"
                    className="rounded border border-blue-200 px-2 py-1"
                    value={o.expectedDate ?? ""}
                    onChange={(e) => saveOrder({ ...o, expectedDate: e.target.value })}
                  />
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {o.status === "borrador" && (
                  <>
                    <button onClick={() => setEditing(o)} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100">
                      Editar
                    </button>
                    <button onClick={() => markSent(o)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                      Marcar enviado
                    </button>
                  </>
                )}
                {o.status === "enviado" && (
                  <button
                    onClick={() => setVerifying(o)}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                  >
                    ✓ Verificar recepción
                  </button>
                )}
                {o.status === "recibido" && (
                  <button
                    onClick={() => setVerifying(o)}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
                  >
                    Ver verificación
                  </button>
                )}
                <button
                  onClick={() => downloadImage(o)}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
                >
                  ⬇ Imagen
                </button>
                <button
                  onClick={() => s && printOrder(o, s, { businessName: config.general.businessName, products })}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
                >
                  🖨 Imprimir
                </button>
                <button
                  onClick={() => confirm("¿Eliminar pedido?") && removeOrder(o.id)}
                  className="rounded-lg px-3 py-1.5 text-sm text-red-500 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/** Editor de líneas de un pedido para el proveedor seleccionado. */
function OrderEditor({
  order,
  onSave,
  onCancel,
}: {
  order: Order;
  onSave: (o: Order) => void;
  onCancel: () => void;
}) {
  const { suppliers, products } = useOrders();
  const [supplierId, setSupplierId] = useState(order.supplierId);
  const [qty, setQty] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    order.lines.forEach((l) => (m[l.productId] = l.qty));
    return m;
  });
  const [note, setNote] = useState(order.note ?? "");

  const items = products.filter((p) => p.supplierId === supplierId);

  const save = () => {
    const lines = Object.entries(qty)
      .filter(([, q]) => q > 0)
      .map(([productId, q]) => ({ productId, qty: q }));
    onSave({ ...order, supplierId, lines, note });
  };

  const input =
    "rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Proveedor</label>
            <select
              className={input}
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                setQty({});
              }}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100">
              Cancelar
            </button>
            <button onClick={save} className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90">
              Guardar pedido
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold">Productos</h3>
        {items.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Este proveedor no tiene productos. Añádelos en la pestaña «Productos».
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {items.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                <span className="text-xs text-neutral-400">{p.unit}</span>
                <input
                  type="number"
                  min={0}
                  className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-sm focus:border-brand focus:outline-none"
                  value={qty[p.id] ?? ""}
                  placeholder="0"
                  onChange={(e) => setQty((m) => ({ ...m, [p.id]: Number(e.target.value) }))}
                />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium">Nota (opcional)</label>
          <input className={`${input} w-full`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Indicaciones para el proveedor" />
        </div>
      </div>
    </div>
  );
}

/** Checklist de recepción: marcar qué llegó y confirmar. */
function ReceptionView({
  order,
  onSave,
  onCancel,
}: {
  order: Order;
  onSave: (o: Order) => void;
  onCancel: () => void;
}) {
  const { suppliers, products } = useOrders();
  const supplier = suppliers.find((s) => s.id === order.supplierId);
  const readOnly = order.status === "recibido";

  const [lines, setLines] = useState(() =>
    order.lines
      .filter((l) => l.qty > 0)
      .map((l) => ({
        ...l,
        received: l.received ?? false,
        receivedQty: l.receivedQty ?? l.qty,
      }))
  );

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "—";
  const productUnit = (id: string) => products.find((p) => p.id === id)?.unit ?? "";

  const checked = lines.filter((l) => l.received).length;
  const total = lines.length;
  const allChecked = total > 0 && checked === total;

  const toggle = (id: string) =>
    setLines((ls) =>
      ls.map((l) => (l.productId === id ? { ...l, received: !l.received } : l))
    );
  const setRecQty = (id: string, q: number) =>
    setLines((ls) =>
      ls.map((l) => (l.productId === id ? { ...l, receivedQty: q } : l))
    );

  const persist = (status: Order["status"]) =>
    onSave({ ...order, status, lines });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: supplier?.color }} />
            <div>
              <h3 className="font-semibold">Recepción · {supplier?.name}</h3>
              <p className="text-xs text-neutral-500">
                {checked}/{total} productos verificados
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100">
            Volver
          </button>
        </div>
        {/* Barra de progreso */}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${total ? (checked / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <ul className="divide-y divide-neutral-100">
          {lines.map((l) => {
            const diff = l.received && l.receivedQty !== l.qty;
            return (
              <li key={l.productId} className="flex items-center gap-3 py-3">
                <input
                  type="checkbox"
                  checked={l.received}
                  disabled={readOnly}
                  onChange={() => toggle(l.productId)}
                  className="h-5 w-5 shrink-0 accent-green-600"
                />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm ${l.received ? "text-neutral-500 line-through" : "font-medium"}`}>
                    {productName(l.productId)}
                  </p>
                  {diff && (
                    <p className="text-xs text-amber-600">
                      Pedido {l.qty}, recibido {l.receivedQty}
                    </p>
                  )}
                </div>
                <span className="text-xs text-neutral-400">pedido: {l.qty}</span>
                <input
                  type="number"
                  min={0}
                  disabled={readOnly}
                  className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-sm focus:border-brand focus:outline-none disabled:bg-neutral-50"
                  value={l.receivedQty}
                  onChange={(e) => setRecQty(l.productId, Number(e.target.value))}
                />
                <span className="w-12 text-xs text-neutral-400">{productUnit(l.productId)}</span>
              </li>
            );
          })}
        </ul>

        {!readOnly && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => persist("recibido")}
              disabled={!allChecked}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Confirmar recepción completa
            </button>
            <button
              onClick={() => persist("enviado")}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
            >
              Guardar avance
            </button>
            {!allChecked && (
              <span className="self-center text-xs text-neutral-400">
                Marca todos los productos para confirmar la recepción completa.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

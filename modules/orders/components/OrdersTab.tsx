"use client";

import { useMemo, useState } from "react";
import { useConfig } from "@/core/config/ConfigProvider";
import { useOrders } from "../store";
import { useStockControl } from "../hooks";
import type { Order, OrderStatus } from "../types";
import { printOrder } from "../print";
import { renderOrderImage, downloadDataUrl } from "../orderImage";
import { SupplierAvatar, StatusPill, Stepper, inputCls } from "./ui";
import {
  addDays,
  buildOrderMessage,
  formatDate,
  formatMoney,
  formatRef,
  isLowStock,
  orderTotal,
  orderUnits,
  suggestedQty,
  todayISO,
  uid,
  whatsappUrl,
} from "../utils";

export function OrdersTab() {
  const { config } = useConfig();
  const currency = config.general.currency;
  const { suppliers, products, orders, saveOrder, removeOrder, confirmReception } = useOrders();
  const stockOn = useStockControl();
  const [editing, setEditing] = useState<Order | null>(null);
  const [verifying, setVerifying] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "todos">("todos");
  const [supplierFilter, setSupplierFilter] = useState("");

  const supplier = (id: string) => suppliers.find((s) => s.id === id);

  const filtered = useMemo(
    () =>
      [...orders]
        .filter((o) => statusFilter === "todos" || o.status === statusFilter)
        .filter((o) => !supplierFilter || o.supplierId === supplierFilter)
        .sort((a, b) => (b.reference ?? 0) - (a.reference ?? 0)),
    [orders, statusFilter, supplierFilter]
  );

  const filteredTotal = filtered.reduce((a, o) => a + orderTotal(o, products), 0);

  const newOrder = () => {
    if (!suppliers[0]) return;
    setEditing({ id: uid(), supplierId: suppliers[0].id, createdAt: todayISO(), status: "borrador", lines: [], note: "" });
  };

  const markSent = (o: Order) => {
    const s = supplier(o.supplierId);
    saveOrder({ ...o, status: "enviado", sentAt: todayISO(), expectedDate: addDays(todayISO(), s?.leadDays ?? 1) });
  };

  const downloadImage = (o: Order) => {
    const s = supplier(o.supplierId);
    if (!s) return;
    const dataUrl = renderOrderImage(o, s, products, {
      businessName: config.general.businessName,
      brandColor: config.general.brandColor,
      currency,
    });
    downloadDataUrl(dataUrl, `pedido_${formatRef(o.reference)}_${s.name.replace(/\s+/g, "_")}.png`);
  };

  const sendWhatsApp = (o: Order) => {
    const s = supplier(o.supplierId);
    if (!s) return;
    window.open(whatsappUrl(s.phone, buildOrderMessage(o, s, products, config.general.businessName, currency)), "_blank");
  };

  if (suppliers.length === 0) {
    return <EmptyState>Primero crea proveedores y productos.</EmptyState>;
  }

  if (editing) {
    return <OrderEditor order={editing} currency={currency} stockOn={stockOn} onCancel={() => setEditing(null)} onSave={(o) => { saveOrder(o); setEditing(null); }} />;
  }

  if (verifying) {
    return (
      <ReceptionView
        order={verifying}
        stockOn={stockOn}
        onCancel={() => setVerifying(null)}
        onProgress={(o) => { saveOrder(o); setVerifying(null); }}
        onConfirm={(o) => {
          if (stockOn) confirmReception(o);
          else saveOrder({ ...o, status: "recibido", receivedAt: todayISO() });
          setVerifying(null);
        }}
      />
    );
  }

  const selectCls = "rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          onClick={newOrder}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-medium text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
        >
          <span className="text-lg leading-none">＋</span> Nuevo pedido
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <select className={selectCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "todos")}>
            <option value="todos">Todos los estados</option>
            <option value="borrador">Borrador</option>
            <option value="enviado">Enviado</option>
            <option value="recibido">Recibido</option>
          </select>
          <select className={selectCls} value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
            <option value="">Todos los proveedores</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-600 sm:ml-auto">
          {filtered.length} pedidos · <span className="font-semibold text-neutral-800">{formatMoney(filteredTotal, currency)}</span>
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState>No hay pedidos que coincidan.</EmptyState>
      ) : (
        <div className="grid gap-3">
          {filtered.map((o) => {
            const s = supplier(o.supplierId);
            const total = orderTotal(o, products);
            return (
              <div key={o.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-3">
                  <SupplierAvatar name={s?.name ?? "?"} color={s?.color} logo={s?.logo} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-semibold">
                      <span className="text-xs font-medium text-neutral-400">{formatRef(o.reference)}</span>
                      {s?.name ?? "—"}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {formatDate(o.createdAt)} · {o.lines.filter((l) => l.qty > 0).length} ref · {orderUnits(o)} ud
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold leading-tight">{formatMoney(total, currency)}</p>
                    <StatusPill status={o.status} />
                  </div>
                </div>

                {o.status === "enviado" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm">
                    <span className="text-blue-800">📦 Recepción prevista:</span>
                    <input type="date" className="rounded-lg border border-blue-200 bg-white px-2 py-1" value={o.expectedDate ?? ""} onChange={(e) => saveOrder({ ...o, expectedDate: e.target.value })} />
                  </div>
                )}

                {/* Acciones (scroll horizontal en móvil) */}
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {o.status === "borrador" && (
                    <>
                      <ActionBtn onClick={() => setEditing(o)}>✏️ Editar</ActionBtn>
                      <ActionBtn primary onClick={() => markSent(o)}>📨 Enviar</ActionBtn>
                    </>
                  )}
                  {o.status === "enviado" && (
                    <ActionBtn success onClick={() => setVerifying(o)}>✓ Verificar recepción</ActionBtn>
                  )}
                  {o.status === "recibido" && (
                    <ActionBtn onClick={() => setVerifying(o)}>👁 Ver verificación</ActionBtn>
                  )}
                  {s?.phone && <ActionBtn success onClick={() => sendWhatsApp(o)}>💬 WhatsApp</ActionBtn>}
                  <ActionBtn onClick={() => downloadImage(o)}>⬇ Imagen</ActionBtn>
                  <ActionBtn onClick={() => s && printOrder(o, s, { businessName: config.general.businessName, products, currency })}>🖨 Imprimir</ActionBtn>
                  <ActionBtn danger onClick={() => confirm("¿Eliminar pedido?") && removeOrder(o.id)}>🗑</ActionBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  primary,
  success,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  success?: boolean;
  danger?: boolean;
}) {
  const tone = primary
    ? "bg-blue-600 text-white hover:bg-blue-700"
    : success
    ? "bg-green-600 text-white hover:bg-green-700"
    : danger
    ? "text-red-500 hover:bg-red-50"
    : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100";
  return (
    <button onClick={onClick} className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium transition ${tone}`}>
      {children}
    </button>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-sm text-neutral-400">
      {children}
    </div>
  );
}

/** Editor de líneas con precios, stock, sugerencia y barra de acción fija. */
function OrderEditor({
  order,
  currency,
  stockOn,
  onSave,
  onCancel,
}: {
  order: Order;
  currency: string;
  stockOn: boolean;
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
  const [search, setSearch] = useState("");

  const allItems = products.filter((p) => p.supplierId === supplierId);
  const items = allItems.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const total = allItems.reduce((a, p) => a + (qty[p.id] ?? 0) * (p.price ?? 0), 0);
  const refCount = Object.values(qty).filter((q) => q > 0).length;

  const suggest = () => {
    const next: Record<string, number> = { ...qty };
    allItems.forEach((p) => {
      if (isLowStock(p)) next[p.id] = suggestedQty(p);
    });
    setQty(next);
  };

  const save = () => {
    const lines = Object.entries(qty).filter(([, q]) => q > 0).map(([productId, q]) => ({ productId, qty: q }));
    onSave({ ...order, supplierId, lines, note });
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Cabecera */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Proveedor {order.reference ? `· ${formatRef(order.reference)}` : "· nuevo"}
            </label>
            <select className={inputCls} value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setQty({}); }}>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          {stockOn && (
            <button onClick={suggest} className="rounded-xl border border-brand bg-brand-soft px-3 py-2 text-sm font-medium text-brand transition hover:bg-brand/10">
              💡 Sugerir por stock bajo
            </button>
          )}
        </div>
      </div>

      {/* Productos */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="font-semibold">Productos</h3>
          <span className="text-sm text-neutral-400">({allItems.length})</span>
          {allItems.length > 6 && (
            <input
              className="ml-auto w-40 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-brand focus:outline-none"
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
        </div>
        {allItems.length === 0 ? (
          <EmptyState>Este proveedor no tiene productos. Añádelos en «Productos».</EmptyState>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {items.map((p) => {
              const q = qty[p.id] ?? 0;
              return (
                <li key={p.id} className={`flex items-center gap-3 py-2.5 ${q > 0 ? "" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-400">
                      <span>{p.unit}</span>
                      {p.price ? <span>· {formatMoney(p.price, currency)}</span> : null}
                      {stockOn && <span>· stock {p.stock ?? 0}</span>}
                      {stockOn && isLowStock(p) && <span className="rounded bg-red-100 px-1.5 font-medium text-red-700">bajo</span>}
                    </p>
                  </div>
                  {q > 0 && (
                    <span className="hidden w-20 text-right text-sm font-medium text-neutral-700 sm:block">
                      {formatMoney(q * (p.price ?? 0), currency)}
                    </span>
                  )}
                  <Stepper value={q} onChange={(v) => setQty((m) => ({ ...m, [p.id]: v }))} />
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Nota para el proveedor</label>
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Indicaciones, horario de entrega…" />
        </div>
      </div>

      {/* Barra de acción fija */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-neutral-400">{refCount} referencias</p>
            <p className="text-lg font-bold leading-tight">{formatMoney(total, currency)}</p>
          </div>
          <button onClick={onCancel} className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-100">
            Cancelar
          </button>
          <button onClick={save} className="rounded-xl bg-brand px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]">
            Guardar pedido
          </button>
        </div>
      </div>
    </div>
  );
}

/** Checklist de recepción: marca qué llegó, suma al stock al confirmar. */
function ReceptionView({
  order,
  stockOn,
  onConfirm,
  onProgress,
  onCancel,
}: {
  order: Order;
  stockOn: boolean;
  onConfirm: (o: Order) => void;
  onProgress: (o: Order) => void;
  onCancel: () => void;
}) {
  const { suppliers, products } = useOrders();
  const supplier = suppliers.find((s) => s.id === order.supplierId);
  const readOnly = order.status === "recibido";

  const [lines, setLines] = useState(() =>
    order.lines.filter((l) => l.qty > 0).map((l) => ({ ...l, received: l.received ?? false, receivedQty: l.receivedQty ?? l.qty }))
  );

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "—";
  const productUnit = (id: string) => products.find((p) => p.id === id)?.unit ?? "";

  const checked = lines.filter((l) => l.received).length;
  const total = lines.length;
  const allChecked = total > 0 && checked === total;
  const pct = total ? Math.round((checked / total) * 100) : 0;

  const toggle = (id: string) => setLines((ls) => ls.map((l) => (l.productId === id ? { ...l, received: !l.received } : l)));
  const setRecQty = (id: string, q: number) => setLines((ls) => ls.map((l) => (l.productId === id ? { ...l, receivedQty: q } : l)));

  return (
    <div className="space-y-4 pb-24">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <SupplierAvatar name={supplier?.name ?? "?"} color={supplier?.color} logo={supplier?.logo} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold">Recepción · {supplier?.name}</h3>
            <p className="text-xs text-neutral-500">{checked}/{total} verificados · {pct}%</p>
          </div>
          <button onClick={onCancel} className="rounded-xl border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100">Volver</button>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <ul className="divide-y divide-neutral-100">
          {lines.map((l) => {
            const diff = l.received && l.receivedQty !== l.qty;
            return (
              <li key={l.productId} className={`flex items-center gap-3 rounded-xl px-2 py-3 transition ${l.received ? "bg-green-50/60" : ""}`}>
                <input type="checkbox" checked={l.received} disabled={readOnly} onChange={() => toggle(l.productId)} className="h-5 w-5 shrink-0 accent-green-600" />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm ${l.received ? "text-neutral-500 line-through" : "font-medium"}`}>{productName(l.productId)}</p>
                  {diff ? (
                    <p className="text-xs text-amber-600">Pedido {l.qty} · recibido {l.receivedQty}</p>
                  ) : (
                    <p className="text-xs text-neutral-400">Pedido: {l.qty} {productUnit(l.productId)}</p>
                  )}
                </div>
                <Stepper value={l.receivedQty ?? 0} onChange={(v) => !readOnly && setRecQty(l.productId, v)} />
              </li>
            );
          })}
        </ul>
      </div>

      {!readOnly && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
            <span className="mr-auto text-sm text-neutral-500">{checked}/{total} verificados</span>
            <button onClick={() => onProgress({ ...order, status: "enviado", lines })} className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-100">
              Guardar avance
            </button>
            <button onClick={() => onConfirm({ ...order, lines })} disabled={!allChecked} className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 disabled:opacity-40">
              {stockOn ? "Confirmar y sumar al stock" : "Confirmar recepción"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

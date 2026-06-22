"use client";

import { useMemo } from "react";
import { useConfig } from "@/core/config/ConfigProvider";
import { useOrders } from "../store";
import type { Order } from "../types";
import { renderOrderImage, downloadDataUrl } from "../orderImage";
import { printOrder } from "../print";
import { SupplierAvatar, StatusPill } from "./ui";
import {
  addDays,
  buildOrderMessage,
  formatMoney,
  formatRef,
  orderTotal,
  orderUnits,
  todayISO,
  whatsappUrl,
} from "../utils";

/**
 * Vista a pantalla completa para enseñar el pedido al proveedor cuando llega
 * al local: imagen grande del pedido + acciones rápidas (enviar, WhatsApp,
 * descargar, imprimir). Pensada para mostrarse en tablet/móvil.
 */
export function OrderPresent({ order, onClose }: { order: Order; onClose: () => void }) {
  const { config } = useConfig();
  const currency = config.general.currency;
  const { suppliers, products, saveOrder } = useOrders();
  const supplier = suppliers.find((s) => s.id === order.supplierId);

  const dataUrl = useMemo(
    () =>
      supplier
        ? renderOrderImage(order, supplier, products, {
            businessName: config.general.businessName,
            brandColor: config.general.brandColor,
            currency,
          })
        : "",
    [order, supplier, products, config.general.businessName, config.general.brandColor, currency]
  );

  if (!supplier) return null;

  const total = orderTotal(order, products);
  const lines = order.lines.filter((l) => l.qty > 0);

  const markSent = () => {
    saveOrder({ ...order, status: "enviado", sentAt: todayISO(), expectedDate: addDays(todayISO(), supplier.leadDays ?? 1) });
    onClose();
  };

  const sendWhatsApp = () => {
    if (!supplier.phone) return;
    window.open(whatsappUrl(supplier.phone, buildOrderMessage(order, supplier, products, config.general.businessName, currency)), "_blank");
  };

  const btn = "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition active:scale-[0.98]";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-neutral-900/95 backdrop-blur">
      {/* Cabecera */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 text-white">
        <SupplierAvatar name={supplier.name} color={supplier.color} logo={supplier.logo} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold leading-tight">{supplier.name}</p>
          <p className="flex items-center gap-2 text-xs text-white/60">
            <span>{formatRef(order.reference)}</span>
            <span>· {lines.length} ref · {orderUnits(order)} ud</span>
          </p>
        </div>
        <StatusPill status={order.status} />
        <button onClick={onClose} className="ml-1 rounded-lg p-2 text-xl leading-none text-white/70 transition hover:bg-white/10 hover:text-white" aria-label="Cerrar">✕</button>
      </div>

      {/* Imagen del pedido (lo que se enseña al proveedor) */}
      <div className="flex-1 overflow-y-auto p-4">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={`Pedido ${formatRef(order.reference)}`} className="mx-auto w-full max-w-md rounded-2xl bg-white shadow-2xl" />
        ) : (
          <p className="mt-10 text-center text-sm text-white/60">No se pudo generar la imagen.</p>
        )}
      </div>

      {/* Barra de acciones grande */}
      <div className="border-t border-white/10 bg-neutral-900/80 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md flex-col gap-2">
          <div className="flex items-center justify-between px-1 text-white">
            <span className="text-xs text-white/60">Total del pedido</span>
            <span className="text-lg font-bold">{formatMoney(total, currency)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {order.status === "borrador" ? (
              <button onClick={markSent} className={`${btn} col-span-2 bg-brand text-white hover:opacity-90`}>
                📨 Realizar pedido (marcar enviado)
              </button>
            ) : null}
            {supplier.phone && (
              <button onClick={sendWhatsApp} className={`${btn} bg-green-600 text-white hover:bg-green-700`}>💬 WhatsApp</button>
            )}
            <button onClick={() => downloadDataUrl(dataUrl, `pedido_${formatRef(order.reference)}_${supplier.name.replace(/\s+/g, "_")}.png`)} className={`${btn} bg-white/10 text-white hover:bg-white/20`}>
              ⬇ Descargar
            </button>
            <button onClick={() => printOrder(order, supplier, { businessName: config.general.businessName, products, currency })} className={`${btn} bg-white/10 text-white hover:bg-white/20`}>
              🖨 Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

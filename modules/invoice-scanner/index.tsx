"use client";

import type { ModuleDefinition } from "@/core/modules/types";
import { OrdersProvider } from "@/modules/orders/store";
import { InvoiceScannerView } from "./InvoiceScannerView";

function InvoiceScannerPage() {
  return (
    // Reutiliza el store de pedidos (mismo catálogo en Supabase).
    <OrdersProvider>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Escáner de albaranes</h1>
          <p className="text-neutral-500">
            Lee el albarán/factura del proveedor y añade los productos al catálogo
            (nombre, precio y cantidad recibida).
          </p>
        </header>
        <InvoiceScannerView />
      </div>
    </OrdersProvider>
  );
}

export const invoiceScannerModule: ModuleDefinition = {
  id: "invoice-scanner",
  name: "Escáner albaranes",
  description: "Escanea albaranes con IA y añade productos al catálogo con precio y stock.",
  icon: "🧾",
  order: 5,
  enabledByDefault: true,
  Page: InvoiceScannerPage,
  settings: {
    fields: [
      {
        key: "experimental",
        label: "Función experimental",
        type: "boolean",
        defaultValue: true,
        description: "Requiere GEMINI_API_KEY en el servidor.",
      },
    ],
  },
};

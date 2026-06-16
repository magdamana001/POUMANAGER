"use client";

import type { ModuleDefinition } from "@/core/modules/types";
import { OrdersProvider } from "@/modules/orders/store";
import { ScannerView } from "./ScannerView";

function ScannerPage() {
  return (
    // Reutiliza el store de pedidos (mismo dato en Supabase) para añadir al catálogo.
    <OrdersProvider>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Escáner IA</h1>
          <p className="text-neutral-500">
            Identifica productos con la cámara y añádelos al catálogo de pedidos.
          </p>
        </header>
        <ScannerView />
      </div>
    </OrdersProvider>
  );
}

export const scannerModule: ModuleDefinition = {
  id: "scanner",
  name: "Escáner IA",
  description: "Identifica productos con la cámara (Gemini) y los añade al catálogo.",
  icon: "📷",
  order: 4,
  enabledByDefault: true,
  Page: ScannerPage,
  settings: {
    fields: [
      {
        key: "experimental",
        label: "Función experimental",
        type: "boolean",
        defaultValue: true,
        description: "Requiere la clave GEMINI_API_KEY en el servidor.",
      },
    ],
  },
};

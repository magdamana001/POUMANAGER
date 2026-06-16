"use client";

import { useState } from "react";
import type { ModuleDefinition } from "@/core/modules/types";
import { OrdersProvider } from "./store";
import { AgendaTab } from "./components/AgendaTab";
import { OrdersTab } from "./components/OrdersTab";
import { ProductsTab } from "./components/ProductsTab";
import { SuppliersTab } from "./components/SuppliersTab";

const TABS = [
  { id: "agenda", label: "Agenda", icon: "📅" },
  { id: "orders", label: "Pedidos", icon: "🧾" },
  { id: "products", label: "Productos", icon: "📦" },
  { id: "suppliers", label: "Proveedores", icon: "🚚" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function OrdersPage() {
  const [tab, setTab] = useState<TabId>("agenda");

  return (
    <OrdersProvider>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Pedidos a proveedores</h1>
          <p className="text-neutral-500">
            Agenda de visitas, catálogo por proveedor, pedidos e impresión.
          </p>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-neutral-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? "border-brand text-brand"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "agenda" && <AgendaTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "products" && <ProductsTab />}
        {tab === "suppliers" && <SuppliersTab />}
      </div>
    </OrdersProvider>
  );
}

export const ordersModule: ModuleDefinition = {
  id: "orders",
  name: "Pedidos",
  description: "Pedidos a proveedores: agenda de visitas, catálogo, envío y recepción.",
  icon: "🧾",
  order: 3,
  enabledByDefault: true,
  Page: OrdersPage,
  settings: {
    fields: [
      {
        key: "defaultLeadDays",
        label: "Días de entrega por defecto",
        type: "number",
        defaultValue: 1,
        description: "Días estimados hasta recibir, al crear un proveedor nuevo.",
      },
      {
        key: "alertOnReceiveDay",
        label: "Avisar el día de recepción",
        type: "boolean",
        defaultValue: true,
      },
    ],
  },
};

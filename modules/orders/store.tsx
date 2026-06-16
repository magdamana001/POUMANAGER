"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Order, OrdersData, Product, Supplier } from "./types";
import { uid } from "./utils";
import { usePersistentState } from "@/core/db/usePersistentState";

const STORAGE_KEY = "espou-orders-data";
const EMPTY: OrdersData = { suppliers: [], products: [], orders: [] };

function normalize(stored: OrdersData | undefined): OrdersData {
  return {
    suppliers: stored?.suppliers ?? [],
    products: stored?.products ?? [],
    orders: stored?.orders ?? [],
  };
}

interface StoreValue {
  ready: boolean;
  suppliers: Supplier[];
  products: Product[];
  orders: Order[];
  addSupplier: (s: Omit<Supplier, "id">) => void;
  updateSupplier: (id: string, patch: Partial<Supplier>) => void;
  removeSupplier: (id: string) => void;
  addProduct: (p: Omit<Product, "id">) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  saveOrder: (o: Order) => void;
  removeOrder: (id: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { state: data, mutate, ready } = usePersistentState<OrdersData>(
    STORAGE_KEY,
    EMPTY,
    normalize
  );

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      suppliers: data.suppliers,
      products: data.products,
      orders: data.orders,
      addSupplier: (s) =>
        mutate((d) => ({ ...d, suppliers: [...d.suppliers, { ...s, id: uid() }] })),
      updateSupplier: (id, patch) =>
        mutate((d) => ({
          ...d,
          suppliers: d.suppliers.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      removeSupplier: (id) =>
        mutate((d) => ({
          suppliers: d.suppliers.filter((x) => x.id !== id),
          products: d.products.filter((p) => p.supplierId !== id),
          orders: d.orders.filter((o) => o.supplierId !== id),
        })),
      addProduct: (p) =>
        mutate((d) => ({ ...d, products: [...d.products, { ...p, id: uid() }] })),
      updateProduct: (id, patch) =>
        mutate((d) => ({
          ...d,
          products: d.products.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      removeProduct: (id) =>
        mutate((d) => ({
          ...d,
          products: d.products.filter((x) => x.id !== id),
          orders: d.orders.map((o) => ({
            ...o,
            lines: o.lines.filter((l) => l.productId !== id),
          })),
        })),
      saveOrder: (o) =>
        mutate((d) => {
          const exists = d.orders.some((x) => x.id === o.id);
          return {
            ...d,
            orders: exists
              ? d.orders.map((x) => (x.id === o.id ? o : x))
              : [...d.orders, o],
          };
        }),
      removeOrder: (id) =>
        mutate((d) => ({ ...d, orders: d.orders.filter((o) => o.id !== id) })),
    }),
    [data, ready, mutate]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useOrders(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useOrders debe usarse dentro de <OrdersProvider>");
  return ctx;
}

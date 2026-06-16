"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Order, OrdersData, Product, Supplier } from "./types";
import { uid } from "./utils";
import { dbGetMigrating, dbSet } from "@/core/db/store";

const STORAGE_KEY = "espou-orders-data";
const EMPTY: OrdersData = { suppliers: [], products: [], orders: [] };

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
  const [data, setData] = useState<OrdersData>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    dbGetMigrating<OrdersData>(STORAGE_KEY)
      .then((p) => {
        if (active && p) {
          setData({
            suppliers: p.suppliers ?? [],
            products: p.products ?? [],
            orders: p.orders ?? [],
          });
        }
      })
      .catch(() => {})
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    dbSet(STORAGE_KEY, data).catch(() => {});
  }, [data, ready]);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      suppliers: data.suppliers,
      products: data.products,
      orders: data.orders,
      addSupplier: (s) =>
        setData((d) => ({ ...d, suppliers: [...d.suppliers, { ...s, id: uid() }] })),
      updateSupplier: (id, patch) =>
        setData((d) => ({
          ...d,
          suppliers: d.suppliers.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      removeSupplier: (id) =>
        setData((d) => ({
          suppliers: d.suppliers.filter((x) => x.id !== id),
          products: d.products.filter((p) => p.supplierId !== id),
          orders: d.orders.filter((o) => o.supplierId !== id),
        })),
      addProduct: (p) =>
        setData((d) => ({ ...d, products: [...d.products, { ...p, id: uid() }] })),
      updateProduct: (id, patch) =>
        setData((d) => ({
          ...d,
          products: d.products.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      removeProduct: (id) =>
        setData((d) => ({
          ...d,
          products: d.products.filter((x) => x.id !== id),
          orders: d.orders.map((o) => ({
            ...o,
            lines: o.lines.filter((l) => l.productId !== id),
          })),
        })),
      saveOrder: (o) =>
        setData((d) => {
          const exists = d.orders.some((x) => x.id === o.id);
          return {
            ...d,
            orders: exists
              ? d.orders.map((x) => (x.id === o.id ? o : x))
              : [...d.orders, o],
          };
        }),
      removeOrder: (id) =>
        setData((d) => ({ ...d, orders: d.orders.filter((o) => o.id !== id) })),
    }),
    [data, ready]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useOrders(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useOrders debe usarse dentro de <OrdersProvider>");
  return ctx;
}

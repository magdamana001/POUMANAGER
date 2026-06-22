"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/core/db/usePersistentState";
import { uid } from "@/core/util/id";

export interface SavedDish {
  id: string;
  name: string;
  price: string;
}

interface DishesData {
  dishes: SavedDish[];
}

const STORAGE_KEY = "espou-sugerencias-dishes";
const DEFAULTS: DishesData = { dishes: [] };

function normalize(stored: DishesData | undefined): DishesData {
  if (!stored) return DEFAULTS;
  return {
    dishes: (stored.dishes ?? []).map((d) => ({
      id: d.id ?? uid(),
      name: d.name ?? "",
      price: d.price ?? "",
    })),
  };
}

interface StoreValue {
  ready: boolean;
  dishes: SavedDish[];
  /** Guarda un plato; si ya existe uno con el mismo nombre, actualiza su precio. */
  saveDish: (name: string, price: string) => void;
  removeDish: (id: string) => void;
}

const Ctx = createContext<StoreValue | null>(null);

export function SuggestionDishesProvider({ children }: { children: ReactNode }) {
  const { state, mutate, ready } = usePersistentState<DishesData>(STORAGE_KEY, DEFAULTS, normalize);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      dishes: state.dishes,
      saveDish: (name, price) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        mutate((d) => {
          const idx = d.dishes.findIndex((x) => x.name.trim().toLowerCase() === trimmed.toLowerCase());
          if (idx >= 0) {
            const next = [...d.dishes];
            next[idx] = { ...next[idx], price };
            return { ...d, dishes: next };
          }
          return { ...d, dishes: [...d.dishes, { id: uid(), name: trimmed, price }] };
        });
      },
      removeDish: (id) => mutate((d) => ({ ...d, dishes: d.dishes.filter((x) => x.id !== id) })),
    }),
    [ready, state, mutate]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSuggestionDishes(): StoreValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSuggestionDishes debe usarse dentro de <SuggestionDishesProvider>");
  return ctx;
}

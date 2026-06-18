"use client";

import { useConfig } from "@/core/config/ConfigProvider";

/** ¿Está activado el control de stock en toda la app? (ajuste del admin) */
export function useStockControl(): boolean {
  const { config } = useConfig();
  const v = config.modules["orders"]?.settings?.stockControl;
  return v === undefined ? true : Boolean(v);
}

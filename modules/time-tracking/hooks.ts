"use client";

import { useEffect, useState } from "react";
import { useConfig } from "@/core/config/ConfigProvider";

/** Minutos de redondeo configurados en el panel de admin. */
export function useRounding(): number {
  const { config } = useConfig();
  const v = config.modules["time-tracking"]?.settings?.roundingMinutes;
  return typeof v === "number" && v > 0 ? v : 0;
}

/** Re-renderiza periódicamente para refrescar los contadores en vivo. */
export function useTick(intervalMs = 20000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

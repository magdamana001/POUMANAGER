"use client";

import { useState } from "react";
import Link from "next/link";
import { useNotifications } from "./store";

const HIDDEN_KEY = "espou-notif-banner-hidden";

/**
 * Banner sutil (no bloqueante) que recuerda al usuario que no tiene
 * las notificaciones activas. Se puede cerrar por sesión.
 */
export function NotificationBanner() {
  const { permission, pushEnabled, ready } = useNotifications();
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return true;
    return !!sessionStorage.getItem(HIDDEN_KEY);
  });

  if (!ready || hidden) return null;
  // Si ya tiene permiso + push, no mostrar nada.
  if (permission === "granted" && pushEnabled) return null;
  // Si no soporta notificaciones, no insistir.
  if (permission === "unsupported") return null;

  const close = () => {
    sessionStorage.setItem(HIDDEN_KEY, "1");
    setHidden(true);
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
      <span className="text-lg">🔕</span>
      <p className="min-w-0 flex-1">
        Las notificaciones no están activas.{" "}
        <Link href="/admin" className="font-medium underline">
          Actívalas en Configuración
        </Link>{" "}
        para no perderte recordatorios.
      </p>
      <button onClick={close} className="shrink-0 rounded-lg px-2 py-1 text-amber-600 hover:bg-amber-100">
        ✕
      </button>
    </div>
  );
}

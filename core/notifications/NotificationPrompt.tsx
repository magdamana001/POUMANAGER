"use client";

import { useEffect, useState } from "react";
import { useNotifications } from "./store";

const DISMISSED_KEY = "espou-notif-prompt-dismissed";

/**
 * Modal de primer acceso: pide permiso de notificaciones y activa push.
 * Solo aparece una vez (hasta que el usuario elige). Si rechaza, se marca
 * como "descartado" y no vuelve a molestar (verá el banner en su lugar).
 */
export function NotificationPrompt() {
  const { permission, pushEnabled, pushSupported: hasPush, requestPermission, enablePush, setEnabled } = useNotifications();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Muestra el modal si nunca se descartó y aún no hay permiso/push.
    if (typeof window === "undefined") return;
    if (permission === "unsupported") return;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;
    if (permission === "granted" && pushEnabled) return;
    // Pequeña espera para no bloquear la primera carga.
    const t = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(t);
  }, [permission, pushEnabled]);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  };

  const activate = async () => {
    setBusy(true);
    try {
      requestPermission();
      // Espera a que cambie el permiso (el navegador lo pide en popup).
      await new Promise((r) => setTimeout(r, 1500));
      if (Notification.permission === "granted") {
        setEnabled(true);
        if (hasPush) await enablePush();
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
      dismiss();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 text-center text-4xl">🔔</div>
        <h2 className="text-center text-lg font-bold">¿Quieres recibir recordatorios?</h2>
        <p className="mt-2 text-center text-sm text-neutral-500">
          Activando las notificaciones recibirás avisos de fichajes, pedidos a proveedores y más, incluso con la app cerrada.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={activate}
            disabled={busy}
            className="w-full rounded-xl bg-brand py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Activando…" : "Sí, activar notificaciones"}
          </button>
          <button
            onClick={dismiss}
            className="w-full rounded-xl border border-neutral-300 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            Ahora no
          </button>
        </div>
        <p className="mt-3 text-center text-[11px] text-neutral-400">
          Puedes cambiarlo cuando quieras en Configuración → Notificaciones.
        </p>
      </div>
    </div>
  );
}

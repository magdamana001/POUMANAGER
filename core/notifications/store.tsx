"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePersistentState } from "@/core/db/usePersistentState";
import { disablePush as doDisablePush, enablePush as doEnablePush, isFirefoxDesktop, isPushSubscribed, pushSupported } from "./push";
import { categoryIcon, DEFAULT_CATEGORY, type ReminderPreset } from "./categories";
import { WEEKDAYS_SHORT as WEEKDAYS_SHARED, todayISO } from "@/core/util/datetime";
import { uid } from "@/core/util/id";

export const WEEKDAYS_SHORT = WEEKDAYS_SHARED;

export interface Reminder {
  id: string;
  /** Título de la notificación (cabecera). */
  title: string;
  /** Cuerpo / mensaje del recordatorio. */
  label: string;
  /** Categoría (icono + color). */
  category: string;
  /** Hora HH:MM a la que avisar. */
  time: string;
  /** Días de la semana (0=Lun … 6=Dom). */
  days: number[];
  enabled: boolean;
}

interface NotifData {
  enabled: boolean;
  reminders: Reminder[];
}

const STORAGE_KEY = "espou-notifications";
const FIRED_KEY = "espou-notif-fired";
const POLL_MS = 30000;
/** Ventana (min) tras la hora del recordatorio para avisar (evita avisos tardíos). */
const WINDOW_MIN = 90;

const DEFAULTS: NotifData = {
  enabled: false,
  reminders: [
    { id: "seed-clock", title: "Fichar entrada", label: "Recuerda fichar la entrada", category: "fichaje", time: "09:00", days: [0, 1, 2, 3, 4, 5], enabled: false },
    { id: "seed-orders", title: "Pedidos a proveedores", label: "Revisar pedidos a proveedores", category: "pedidos", time: "10:00", days: [0, 2, 4], enabled: false },
  ],
};

function normalize(stored: NotifData | undefined): NotifData {
  if (!stored) return DEFAULTS;
  return {
    enabled: stored.enabled ?? false,
    reminders: (stored.reminders ?? []).map((r) => ({
      id: r.id,
      title: (r as Reminder).title ?? "Recordatorio",
      label: r.label ?? "",
      category: (r as Reminder).category ?? DEFAULT_CATEGORY,
      time: r.time ?? "09:00",
      days: r.days ?? [],
      enabled: r.enabled ?? true,
    })),
  };
}

type Permission = "default" | "granted" | "denied" | "unsupported";

interface StoreValue {
  ready: boolean;
  enabled: boolean;
  reminders: Reminder[];
  permission: Permission;
  pushEnabled: boolean;
  pushSupported: boolean;
  isFirefox: boolean;
  setEnabled: (v: boolean) => void;
  addReminder: (preset?: ReminderPreset) => void;
  duplicateReminder: (id: string) => void;
  updateReminder: (id: string, patch: Partial<Reminder>) => void;
  removeReminder: (id: string) => void;
  setAllEnabled: (v: boolean) => void;
  requestPermission: () => void;
  testNotification: () => void;
  testReminder: (r: Reminder) => void;
  enablePush: () => Promise<boolean>;
  disablePush: () => Promise<void>;
}

const Ctx = createContext<StoreValue | null>(null);

// --- registro de disparos (por dispositivo, en localStorage) ---
function getFired(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) || "{}");
  } catch {
    return {};
  }
}
function setFired(map: Record<string, boolean>) {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

async function fire(body: string, title = "Espou Manager", icon?: string) {
  const heading = icon ? `${icon} ${title}` : title;
  try {
    // En móvil (y recomendado en general) hay que usar el Service Worker.
    if ("serviceWorker" in navigator) {
      const reg =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.register("/sw.js"));
      if (reg) {
        await reg.showNotification(heading, { body, icon: "/favicon.ico", tag: body });
        return;
      }
    }
  } catch {
    /* cae al constructor abajo */
  }
  try {
    new Notification(heading, { body, icon: "/favicon.ico", tag: body });
  } catch {
    /* ignore */
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { state, mutate, ready } = usePersistentState<NotifData>(STORAGE_KEY, DEFAULTS, normalize);
  const [permission, setPermission] = useState<Permission>("default");
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as Permission);
    isPushSubscribed().then(setPushEnabled).catch(() => {});
  }, []);

  // Planificador local: solo cuando NO hay push (el push lo gestiona el servidor).
  useEffect(() => {
    if (!ready || !state.enabled || permission !== "granted" || pushEnabled) return;

    const check = () => {
      const now = new Date();
      const weekday = (now.getDay() + 6) % 7;
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const today = todayISO();
      const fired = getFired();
      let changed = false;

      for (const r of state.reminders) {
        if (!r.enabled || !r.days.includes(weekday)) continue;
        const [h, m] = r.time.split(":").map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) continue;
        const remMin = h * 60 + m;
        const key = `${r.id}_${today}`;
        if (fired[key] || nowMin < remMin) continue;
        if (nowMin - remMin <= WINDOW_MIN) fire(r.label, r.title, categoryIcon(r.category));
        // Dentro o fuera de ventana: marca como disparado para no repetir.
        fired[key] = true;
        changed = true;
      }

      // Limpia disparos de días anteriores.
      for (const k of Object.keys(fired)) {
        if (!k.endsWith(today)) {
          delete fired[k];
          changed = true;
        }
      }
      if (changed) setFired(fired);
    };

    check();
    const id = setInterval(check, POLL_MS);
    return () => clearInterval(id);
  }, [ready, state, permission, pushEnabled]);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      enabled: state.enabled,
      reminders: state.reminders,
      permission,
      pushEnabled,
      pushSupported: pushSupported(),
      isFirefox: isFirefoxDesktop(),
      setEnabled: (v) => mutate((d) => ({ ...d, enabled: v })),
      addReminder: (preset) =>
        mutate((d) => ({
          ...d,
          reminders: [
            ...d.reminders,
            preset
              ? { id: uid(), title: preset.title, label: preset.label, category: preset.category, time: preset.time, days: preset.days, enabled: true }
              : { id: uid(), title: "Nuevo recordatorio", label: "", category: DEFAULT_CATEGORY, time: "09:00", days: [0, 1, 2, 3, 4], enabled: true },
          ],
        })),
      duplicateReminder: (id) =>
        mutate((d) => {
          const r = d.reminders.find((x) => x.id === id);
          if (!r) return d;
          const idx = d.reminders.findIndex((x) => x.id === id);
          const copy: Reminder = { ...r, id: uid(), title: `${r.title} (copia)` };
          const next = [...d.reminders];
          next.splice(idx + 1, 0, copy);
          return { ...d, reminders: next };
        }),
      updateReminder: (id, patch) =>
        mutate((d) => ({ ...d, reminders: d.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      removeReminder: (id) => mutate((d) => ({ ...d, reminders: d.reminders.filter((r) => r.id !== id) })),
      setAllEnabled: (v) => mutate((d) => ({ ...d, reminders: d.reminders.map((r) => ({ ...r, enabled: v })) })),
      requestPermission: () => {
        if (typeof Notification === "undefined") return;
        Notification.requestPermission().then((p) => setPermission(p as Permission));
      },
      testNotification: () => fire("🔔 Notificación de prueba. ¡Funciona!"),
      testReminder: (r) => fire(r.label || "Recordatorio", r.title, categoryIcon(r.category)),
      enablePush: async () => {
        const ok = await doEnablePush();
        if (ok) setPushEnabled(true);
        return ok;
      },
      disablePush: async () => {
        await doDisablePush();
        setPushEnabled(false);
      },
    }),
    [ready, state, permission, pushEnabled, mutate]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications(): StoreValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotifications debe usarse dentro de <NotificationsProvider>");
  return ctx;
}

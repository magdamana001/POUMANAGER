"use client";

import { useMemo, useState } from "react";
import { useNotifications } from "./store";
import { ReminderCard } from "./ReminderCard";
import { PRESETS, getCategory, nextOccurrence } from "./categories";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${value ? "bg-brand" : "bg-neutral-300"}`}
      aria-pressed={value}
    >
      <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${value ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}

export function NotificationsSettings() {
  const {
    enabled, reminders, permission, pushEnabled, pushSupported, isFirefox,
    setEnabled, addReminder, setAllEnabled,
    requestPermission, testNotification, enablePush, disablePush,
  } = useNotifications();

  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const togglePush = async () => {
    setPushBusy(true);
    setPushError(null);
    try {
      if (pushEnabled) await disablePush();
      else {
        const ok = await enablePush();
        if (!ok) setPushError("No se pudo activar el push (revisa las claves VAPID y que la URL sea HTTPS).");
      }
    } catch (e) {
      setPushError(e instanceof Error ? e.message : "Error al activar push");
    } finally {
      setPushBusy(false);
    }
  };

  // Resumen
  const activeCount = reminders.filter((r) => r.enabled).length;
  const nextReminder = useMemo(() => {
    let best: { label: string; date: Date } | null = null;
    for (const r of reminders) {
      const d = nextOccurrence(r);
      if (d && (!best || d < best.date)) best = { label: r.title, date: d };
    }
    return best;
  }, [reminders]);

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {/* Cabecera con estado */}
      <div className="border-b border-neutral-100 bg-gradient-to-br from-neutral-50 to-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <span className="text-xl">🔔</span> Notificaciones
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              Recordatorios al sistema (PC/móvil), incluso con la app cerrada.
            </p>
          </div>
          <Toggle value={enabled} onChange={setEnabled} />
        </div>

        {/* Mini-resumen */}
        {enabled && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-3">
              <p className="text-xs text-neutral-400">Recordatorios activos</p>
              <p className="text-xl font-bold">{activeCount}<span className="text-sm font-normal text-neutral-400"> / {reminders.length}</span></p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-3">
              <p className="text-xs text-neutral-400">Permiso</p>
              <p className="text-sm font-semibold">
                {permission === "granted" ? "✓ Concedido" : permission === "denied" ? "⚠️ Bloqueado" : permission === "unsupported" ? "No soportado" : "Pendiente"}
              </p>
            </div>
            <div className="col-span-2 rounded-xl border border-neutral-200 bg-white p-3 sm:col-span-1">
              <p className="text-xs text-neutral-400">Próximo aviso</p>
              <p className="truncate text-sm font-semibold">
                {nextReminder ? nextReminder.label : "—"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {/* Permiso del navegador */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-neutral-50 p-3 text-sm">
          {permission === "unsupported" ? (
            <span className="text-neutral-500">Este navegador no soporta notificaciones.</span>
          ) : permission === "granted" ? (
            <>
              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">✓ Permiso concedido</span>
              <button onClick={testNotification} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100">
                🔔 Probar notificación
              </button>
            </>
          ) : permission === "denied" ? (
            <span className="text-amber-700">⚠️ Permiso bloqueado. Actívalo en los ajustes del navegador para este sitio.</span>
          ) : (
            <button onClick={requestPermission} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90">
              Activar notificaciones del sistema
            </button>
          )}
        </div>

        {enabled && permission !== "granted" && permission !== "unsupported" && (
          <p className="text-xs text-amber-600">Concede el permiso del navegador para que los recordatorios funcionen.</p>
        )}

        {/* Push (app cerrada) */}
        {permission === "granted" && pushSupported && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 p-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {pushEnabled ? "✅ Push activo en este dispositivo" : "📲 Push con la app cerrada"}
              </p>
              {isFirefox && !pushEnabled ? (
                <p className="text-xs text-amber-700">
                  ⚠️ Firefox en PC no soporta push de forma fiable. Usa <strong>Chrome o Edge</strong> en este equipo, o actívalo desde el móvil.
                </p>
              ) : (
                <p className="text-xs text-neutral-500">
                  {pushEnabled
                    ? "Recibirás recordatorios aunque la web esté cerrada."
                    : "Suscribe este dispositivo para recibir avisos aunque cierres la web."}
                </p>
              )}
              {pushError && <p className="mt-1 text-xs text-red-600">{pushError}</p>}
            </div>
            {!isFirefox && (
              <button
                onClick={togglePush}
                disabled={pushBusy}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition disabled:opacity-50 ${
                  pushEnabled ? "border border-neutral-300 hover:bg-neutral-100" : "bg-brand text-white hover:opacity-90"
                }`}
              >
                {pushBusy ? "…" : pushEnabled ? "Desactivar aquí" : "Activar push"}
              </button>
            )}
          </div>
        )}

        {/* Plantillas rápidas */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">Plantillas rápidas</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p, i) => {
              const cat = getCategory(p.category);
              return (
                <button
                  key={i}
                  onClick={() => addReminder(p)}
                  className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50"
                  title={`${p.label} · ${p.time}`}
                >
                  <span style={{ color: cat.color }}>{cat.icon}</span>
                  {p.title}
                  <span className="text-neutral-300">＋</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recordatorios */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Recordatorios</h3>
            <div className="flex items-center gap-2">
              {reminders.length > 0 && (
                <button
                  onClick={() => setAllEnabled(activeCount !== reminders.length)}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-100"
                >
                  {activeCount === reminders.length ? "Desactivar todos" : "Activar todos"}
                </button>
              )}
              <button onClick={() => addReminder()} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:opacity-90">
                ＋ Nuevo
              </button>
            </div>
          </div>

          {reminders.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-400">
              Sin recordatorios. Usa una <strong>plantilla rápida</strong> de arriba o crea uno nuevo.
            </p>
          ) : (
            <ul className="space-y-3">
              {reminders.map((r) => (
                <ReminderCard key={r.id} reminder={r} />
              ))}
            </ul>
          )}
        </div>

        <p className="rounded-xl bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
          ℹ️ El envío de los avisos (incluso con la app cerrada) se programa en la sección <strong>«Avisos programados (cron-job.org)»</strong>, más abajo en esta página.
        </p>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { useNotifications, WEEKDAYS_SHORT } from "./store";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${value ? "bg-brand" : "bg-neutral-300"}`}
      aria-pressed={value}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${value ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}

export function NotificationsSettings() {
  const {
    enabled, reminders, permission, pushEnabled, pushSupported, isFirefox,
    setEnabled, addReminder, updateReminder, removeReminder,
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

  const input = "rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Notificaciones</h2>
          <p className="text-sm text-neutral-500">Recordatorios al sistema (PC/móvil), incluso con la app cerrada.</p>
        </div>
        <Toggle value={enabled} onChange={setEnabled} />
      </div>

      {/* Permiso del navegador */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-neutral-50 p-3 text-sm">
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

      {enabled && permission !== "granted" && (
        <p className="mt-2 text-xs text-amber-600">Concede el permiso del navegador para que los recordatorios funcionen.</p>
      )}

      {/* Push (app cerrada) */}
      {permission === "granted" && pushSupported && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 p-3 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {pushEnabled ? "✅ Push activo en este dispositivo" : "📲 Push con la app cerrada"}
            </p>
            {isFirefox && !pushEnabled ? (
              <p className="text-xs text-amber-700">
                ⚠️ Firefox en PC no soporta push de forma fiable. Usa <strong>Chrome o Edge</strong> en este equipo para recibir avisos con la app cerrada, o actívalo desde el móvil.
              </p>
            ) : (
              <p className="text-xs text-neutral-500">
                {pushEnabled
                  ? "Recibirás recordatorios aunque la web esté cerrada, vía GitHub Actions."
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
              {pushBusy ? "…" : pushEnabled ? "Desactivar en este dispositivo" : "Activar push"}
            </button>
          )}
        </div>
      )}

      {/* Recordatorios */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Recordatorios</h3>
          <button onClick={addReminder} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100">＋ Añadir</button>
        </div>

        {reminders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-center text-sm text-neutral-400">
            Sin recordatorios. Añade uno (p. ej. «Fichar entrada» o «Revisar pedidos»).
          </p>
        ) : (
          <ul className="space-y-3">
            {reminders.map((r) => (
              <li key={r.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Toggle value={r.enabled} onChange={(v) => updateReminder(r.id, { enabled: v })} />
                  <input
                    className={`${input} min-w-0 flex-1`}
                    value={r.label}
                    onChange={(e) => updateReminder(r.id, { label: e.target.value })}
                    placeholder="Mensaje del recordatorio"
                  />
                  <input type="time" className={input} value={r.time} onChange={(e) => updateReminder(r.id, { time: e.target.value })} />
                  <button onClick={() => removeReminder(r.id)} className="rounded px-2 py-1 text-red-500 hover:bg-red-50">✕</button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {WEEKDAYS_SHORT.map((d, i) => {
                    const on = r.days.includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => updateReminder(r.id, { days: on ? r.days.filter((x) => x !== i) : [...r.days, i].sort() })}
                        className={`rounded-lg px-2.5 py-1 text-xs transition ${on ? "bg-brand text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-5 rounded-xl bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
        ℹ️ El envío de los avisos (incluso con la app cerrada) se programa en la sección <strong>«Avisos programados (cron-job.org)»</strong>, más abajo en esta página.
      </p>
    </section>
  );
}

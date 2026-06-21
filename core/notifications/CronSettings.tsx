"use client";

import { useEffect, useState } from "react";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{n}</span>
      <p className="text-sm text-neutral-600">{children}</p>
    </div>
  );
}

/** Sección de configuración del envío programado de notificaciones (cron-job.org). */
export function CronSettings() {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const url = `${origin || "https://TU-DOMINIO"}/api/push/run?secret=TU_CRON_SECRET`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Avisos programados (cron-job.org)</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Un servicio externo llama periódicamente a la app para enviar los recordatorios push, aunque nadie tenga la web abierta.
      </p>

      {/* URL a usar */}
      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-400">URL del cron</label>
        <div className="flex gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-neutral-100 px-3 py-2 text-xs text-neutral-700">{url}</code>
          <button onClick={copy} className="shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90">
            {copied ? "✓ Copiado" : "Copiar"}
          </button>
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          Reemplaza <code className="rounded bg-neutral-100 px-1">TU_CRON_SECRET</code> por el valor de la variable <code className="rounded bg-neutral-100 px-1">CRON_SECRET</code> que configuraste en Vercel.
        </p>
      </div>

      {/* Pasos */}
      <div className="mt-5 space-y-3">
        <Step n={1}>Entra en <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline">cron-job.org</a> con tu cuenta y pulsa <strong>Create cronjob</strong>.</Step>
        <Step n={2}>En <strong>URL</strong>, pega la URL de arriba (con tu <code className="rounded bg-neutral-100 px-1 text-xs">CRON_SECRET</code> real).</Step>
        <Step n={3}>En <strong>Schedule</strong>, elige <strong>«Every 5 minutes»</strong> (o cada minuto si quieres máxima puntualidad).</Step>
        <Step n={4}>Método de petición: <strong>GET</strong>. Guarda con <strong>Create</strong>. Quedará activo y ejecutándose 24/7.</Step>
        <Step n={5}>Comprueba en cron-job.org que las ejecuciones devuelven <strong>200 OK</strong>.</Step>
      </div>

      <div className="mt-4 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-500">
        <p className="font-medium text-neutral-600">Notas</p>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          <li>El servidor calcula la hora según la <strong>zona horaria</strong> configurada en General, así que pon la URL una sola vez.</li>
          <li>Cada recordatorio se envía <strong>una vez al día</strong> a partir de su hora; no se duplica.</li>
          <li>Necesitas <code className="rounded bg-neutral-100 px-1">VAPID_*</code> y <code className="rounded bg-neutral-100 px-1">CRON_SECRET</code> configurados en Vercel.</li>
        </ul>
      </div>
    </section>
  );
}

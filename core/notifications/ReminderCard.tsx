"use client";

import { useState } from "react";
import { useNotifications, WEEKDAYS_SHORT, type Reminder } from "./store";
import { CATEGORIES, DAY_SHORTCUTS, getCategory, formatNext, sameDays } from "./categories";

function Toggle({ value, onChange, small }: { value: boolean; onChange: (v: boolean) => void; small?: boolean }) {
  const h = small ? "h-5 w-9" : "h-6 w-11";
  const dot = small ? "h-4 w-4" : "h-5 w-5";
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex shrink-0 items-center rounded-full transition ${h} ${value ? "bg-brand" : "bg-neutral-300"}`}
      aria-pressed={value}
    >
      <span className={`inline-block transform rounded-full bg-white shadow transition ${dot} ${value ? (small ? "translate-x-4" : "translate-x-5") : "translate-x-1"}`} />
    </button>
  );
}

const input = "rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";

export function ReminderCard({ reminder }: { reminder: Reminder }) {
  const { updateReminder, removeReminder, duplicateReminder, testReminder } = useNotifications();
  const [open, setOpen] = useState(false);
  const r = reminder;
  const cat = getCategory(r.category);
  const next = formatNext(r);

  return (
    <li
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
        r.enabled ? "border-neutral-200" : "border-neutral-200/70 opacity-70"
      }`}
    >
      {/* Cabecera (resumen) */}
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}
        >
          {cat.icon}
        </span>

        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <p className="truncate font-semibold">{r.title || "Sin título"}</p>
          <p className="truncate text-xs text-neutral-500">
            <span className="font-medium text-neutral-700">{r.time}</span>
            {" · "}
            {r.days.length === 7 ? "Todos los días" : r.days.length === 0 ? "Sin días" : r.days.map((d) => WEEKDAYS_SHORT[d]).join(" ")}
          </p>
        </button>

        <Toggle small value={r.enabled} onChange={(v) => updateReminder(r.id, { enabled: v })} />
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="Editar"
        >
          <span className={`inline-block transition ${open ? "rotate-180" : ""}`}>⌄</span>
        </button>
      </div>

      {/* Pie: próximo aviso (cuando está plegado y activo) */}
      {!open && r.enabled && next && (
        <p className="border-t border-neutral-100 bg-neutral-50/60 px-4 py-1.5 text-xs text-neutral-500">
          ⏰ Próximo aviso {next}
        </p>
      )}

      {/* Editor (desplegado) */}
      {open && (
        <div className="space-y-4 border-t border-neutral-100 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
              Título
              <input
                className={input}
                value={r.title}
                onChange={(e) => updateReminder(r.id, { title: e.target.value })}
                placeholder="Ej. Fichar entrada"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
              Hora
              <input type="time" className={input} value={r.time} onChange={(e) => updateReminder(r.id, { time: e.target.value })} />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
            Mensaje
            <input
              className={input}
              value={r.label}
              onChange={(e) => updateReminder(r.id, { label: e.target.value })}
              placeholder="Texto que verás en la notificación"
            />
          </label>

          {/* Categoría */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-neutral-500">Categoría</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => {
                const on = c.id === r.category;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => updateReminder(r.id, { category: c.id })}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition ${
                      on ? "text-white" : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100"
                    }`}
                    style={on ? { backgroundColor: c.color, borderColor: c.color } : undefined}
                  >
                    <span>{c.icon}</span>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Días */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-medium text-neutral-500">Días</p>
              <div className="flex gap-1">
                {DAY_SHORTCUTS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => updateReminder(r.id, { days: s.days })}
                    className={`rounded-md px-2 py-0.5 text-[11px] transition ${
                      sameDays(r.days, s.days) ? "bg-brand text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS_SHORT.map((d, i) => {
                const on = r.days.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => updateReminder(r.id, { days: on ? r.days.filter((x) => x !== i) : [...r.days, i].sort((a, b) => a - b) })}
                    className={`h-9 w-11 rounded-lg text-xs font-medium transition ${
                      on ? "bg-brand text-white shadow-sm" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {next && (
            <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
              ⏰ Próximo aviso <strong className="text-neutral-700">{next}</strong>
            </p>
          )}

          {/* Acciones */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => testReminder(r)}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
            >
              🔔 Probar
            </button>
            <button
              onClick={() => duplicateReminder(r.id)}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
            >
              ⧉ Duplicar
            </button>
            <button
              onClick={() => removeReminder(r.id)}
              className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              🗑 Eliminar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

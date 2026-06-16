"use client";

import type { SettingField } from "@/core/modules/types";

interface Props {
  field: SettingField;
  value: unknown;
  onChange: (value: unknown) => void;
}

/**
 * Renderiza un único campo de ajustes según su tipo.
 * Lo usan tanto la config general como cada módulo: añadir un
 * tipo de campo aquí lo habilita para toda la app.
 */
export function SettingsField({ field, value, onChange }: Props) {
  const id = `field-${field.key}`;
  const base =
    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
        {field.label}
      </label>

      {field.type === "boolean" ? (
        <button
          type="button"
          id={id}
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            value ? "bg-brand" : "bg-neutral-300"
          }`}
          aria-pressed={Boolean(value)}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              value ? "translate-x-5" : "translate-x-1"
            }`}
          />
        </button>
      ) : field.type === "textarea" ? (
        <textarea
          id={id}
          className={base}
          rows={2}
          placeholder={field.placeholder}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "select" ? (
        <select
          id={id}
          className={base}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === "color" ? (
        <div className="flex items-center gap-3">
          <input
            id={id}
            type="color"
            className="h-9 w-12 cursor-pointer rounded border border-neutral-300"
            value={String(value ?? "#000000")}
            onChange={(e) => onChange(e.target.value)}
          />
          <span className="text-sm text-neutral-500">{String(value ?? "")}</span>
        </div>
      ) : (
        <input
          id={id}
          type={field.type === "number" ? "number" : field.type === "time" ? "time" : "text"}
          className={base}
          placeholder={field.placeholder}
          value={String(value ?? "")}
          onChange={(e) =>
            onChange(field.type === "number" ? Number(e.target.value) : e.target.value)
          }
        />
      )}

      {field.description && (
        <p className="text-xs text-neutral-500">{field.description}</p>
      )}
    </div>
  );
}

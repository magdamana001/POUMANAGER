"use client";

import { useConfig } from "@/core/config/ConfigProvider";
import { GENERAL_SCHEMA } from "@/core/config/types";
import { getAllModules } from "@/core/modules/registry";
import { SettingsField } from "@/core/components/SettingsField";

export default function AdminPage() {
  const {
    config,
    updateGeneral,
    setModuleEnabled,
    updateModuleSettings,
    resetAll,
  } = useConfig();
  const modules = getAllModules();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-neutral-500">Ajustes generales y de cada módulo.</p>
        </div>
        <button
          onClick={resetAll}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
        >
          Restablecer todo
        </button>
      </header>

      {/* Configuración general */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">General</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {GENERAL_SCHEMA.fields.map((field) => (
            <SettingsField
              key={field.key}
              field={field}
              value={(config.general as unknown as Record<string, unknown>)[field.key]}
              onChange={(value) => updateGeneral({ [field.key]: value } as Partial<typeof config.general>)}
            />
          ))}
        </div>
      </section>

      {/* Configuración por módulo (auto-generada) */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Módulos</h2>
        {modules.map((mod) => {
          const state = config.modules[mod.id];
          return (
            <div
              key={mod.id}
              className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{mod.icon}</span>
                  <div>
                    <p className="font-semibold">{mod.name}</p>
                    <p className="text-sm text-neutral-500">{mod.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModuleEnabled(mod.id, !state?.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    state?.enabled ? "bg-brand" : "bg-neutral-300"
                  }`}
                  aria-pressed={Boolean(state?.enabled)}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      state?.enabled ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {state?.enabled && mod.settings && mod.settings.fields.length > 0 && (
                <div className="mt-5 grid gap-4 border-t border-neutral-100 pt-5 sm:grid-cols-2">
                  {mod.settings.fields.map((field) => (
                    <SettingsField
                      key={field.key}
                      field={field}
                      value={state.settings[field.key]}
                      onChange={(value) =>
                        updateModuleSettings(mod.id, { [field.key]: value })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

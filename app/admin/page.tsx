"use client";

import { useState } from "react";
import { useConfig } from "@/core/config/ConfigProvider";
import { GENERAL_SCHEMA } from "@/core/config/types";
import { getAllModules } from "@/core/modules/registry";
import { SettingsField } from "@/core/components/SettingsField";
import { NotificationsSettings } from "@/core/notifications/NotificationsSettings";
import { CronSettings } from "@/core/notifications/CronSettings";

const TABS = [
  { id: "general", label: "General", icon: "🏢" },
  { id: "notifications", label: "Notificaciones", icon: "🔔" },
  { id: "modules", label: "Módulos", icon: "🧩" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminPage() {
  const { config, updateGeneral, setModuleEnabled, updateModuleSettings, resetAll } = useConfig();
  const modules = getAllModules();
  const [tab, setTab] = useState<TabId>("general");
  const [moduleId, setModuleId] = useState<string>(() => modules[0]?.id ?? "");

  const selectedMod = modules.find((m) => m.id === moduleId) ?? modules[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
          <p className="text-neutral-500">Ajustes del negocio, notificaciones y módulos.</p>
        </div>
        <button
          onClick={() => confirm("¿Restablecer toda la configuración a los valores por defecto?") && resetAll()}
          className="rounded-xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
        >
          Restablecer todo
        </button>
      </header>

      {/* Pestañas */}
      <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-neutral-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === t.id ? "bg-white text-brand shadow-sm" : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* General */}
      {tab === "general" && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold">Datos del negocio</h2>
          <p className="mb-4 text-sm text-neutral-500">Nombre, marca, moneda, zona horaria y contacto.</p>
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
      )}

      {/* Notificaciones */}
      {tab === "notifications" && (
        <div className="space-y-6">
          <NotificationsSettings />
          <CronSettings />
        </div>
      )}

      {/* Módulos */}
      {tab === "modules" && selectedMod && (
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Sub-navegación de módulos */}
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0">
            {modules.map((m) => {
              const on = config.modules[m.id]?.enabled;
              const active = m.id === selectedMod.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setModuleId(m.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    active ? "bg-brand text-white shadow-sm" : "bg-white text-neutral-600 hover:bg-neutral-100 lg:bg-transparent"
                  }`}
                >
                  <span>{m.icon}</span>
                  <span className="whitespace-nowrap">{m.name}</span>
                  <span
                    className={`ml-auto hidden h-2 w-2 rounded-full lg:inline-block ${
                      on ? (active ? "bg-white" : "bg-green-500") : "bg-neutral-300"
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          {/* Ajustes del módulo seleccionado */}
          <div className="min-w-0 flex-1">
            {(() => {
              const mod = selectedMod;
              const state = config.modules[mod.id];
              return (
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="text-2xl">{mod.icon}</span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{mod.name}</p>
                        <p className="truncate text-sm text-neutral-500">{mod.description}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModuleEnabled(mod.id, !state?.enabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
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

                  {!state?.enabled && (
                    <p className="mt-4 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-400">
                      Módulo desactivado. Actívalo para ver sus opciones y que aparezca en el menú.
                    </p>
                  )}

                  {state?.enabled && mod.settings && mod.settings.fields.length > 0 && (
                    <div className="mt-5 grid gap-4 border-t border-neutral-100 pt-5 sm:grid-cols-2">
                      {mod.settings.fields.map((field) => (
                        <SettingsField
                          key={field.key}
                          field={field}
                          value={state.settings[field.key]}
                          onChange={(value) => updateModuleSettings(mod.id, { [field.key]: value })}
                        />
                      ))}
                    </div>
                  )}

                  {state?.enabled && mod.SettingsPanel && (
                    <div className="mt-5 border-t border-neutral-100 pt-5">
                      <mod.SettingsPanel />
                    </div>
                  )}

                  {state?.enabled && !mod.SettingsPanel && (!mod.settings || mod.settings.fields.length === 0) && (
                    <p className="mt-4 text-sm text-neutral-400">Este módulo no tiene opciones configurables.</p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

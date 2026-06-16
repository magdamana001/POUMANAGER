"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppConfig, GeneralConfig, ModuleConfigState } from "./types";
import { DEFAULT_GENERAL } from "./types";
import { getAllModules, getModuleDefaultSettings } from "@/core/modules/registry";
import { dbGetMigrating, dbSet } from "@/core/db/store";

const STORAGE_KEY = "espou-manager-config";

interface ConfigContextValue {
  config: AppConfig;
  ready: boolean;
  updateGeneral: (patch: Partial<GeneralConfig>) => void;
  setModuleEnabled: (moduleId: string, enabled: boolean) => void;
  updateModuleSettings: (moduleId: string, patch: Record<string, unknown>) => void;
  resetAll: () => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

/** Construye la configuración por defecto a partir del registro de módulos. */
function buildDefaultConfig(): AppConfig {
  const modules: Record<string, ModuleConfigState> = {};
  for (const mod of getAllModules()) {
    modules[mod.id] = {
      enabled: mod.enabledByDefault ?? true,
      settings: getModuleDefaultSettings(mod),
    };
  }
  return { general: { ...DEFAULT_GENERAL }, modules };
}

/** Mezcla lo guardado con los defaults (para soportar módulos nuevos). */
function mergeConfig(stored: Partial<AppConfig> | null): AppConfig {
  const base = buildDefaultConfig();
  if (!stored) return base;
  const merged: AppConfig = {
    general: { ...base.general, ...(stored.general ?? {}) },
    modules: { ...base.modules },
  };
  for (const id of Object.keys(base.modules)) {
    const storedMod = stored.modules?.[id];
    if (storedMod) {
      merged.modules[id] = {
        enabled: storedMod.enabled ?? base.modules[id].enabled,
        settings: { ...base.modules[id].settings, ...(storedMod.settings ?? {}) },
      };
    }
  }
  return merged;
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(() => buildDefaultConfig());
  const [ready, setReady] = useState(false);

  // Cargar de la base de datos offline una vez en cliente.
  useEffect(() => {
    let active = true;
    dbGetMigrating<Partial<AppConfig>>(STORAGE_KEY)
      .then((stored) => active && setConfig(mergeConfig(stored ?? null)))
      .catch(() => active && setConfig(buildDefaultConfig()))
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);

  // Persistir en cada cambio + aplicar color de marca.
  useEffect(() => {
    if (!ready) return;
    dbSet(STORAGE_KEY, config).catch(() => {});
    document.documentElement.style.setProperty("--brand-color", config.general.brandColor);
  }, [config, ready]);

  const value = useMemo<ConfigContextValue>(
    () => ({
      config,
      ready,
      updateGeneral: (patch) =>
        setConfig((c) => ({ ...c, general: { ...c.general, ...patch } })),
      setModuleEnabled: (moduleId, enabled) =>
        setConfig((c) => ({
          ...c,
          modules: {
            ...c.modules,
            [moduleId]: { ...c.modules[moduleId], enabled },
          },
        })),
      updateModuleSettings: (moduleId, patch) =>
        setConfig((c) => ({
          ...c,
          modules: {
            ...c.modules,
            [moduleId]: {
              ...c.modules[moduleId],
              settings: { ...c.modules[moduleId]?.settings, ...patch },
            },
          },
        })),
      resetAll: () => setConfig(buildDefaultConfig()),
    }),
    [config, ready]
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig debe usarse dentro de <ConfigProvider>");
  return ctx;
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { AppConfig, GeneralConfig, ModuleConfigState } from "./types";
import { DEFAULT_GENERAL } from "./types";
import { getAllModules, getModuleDefaultSettings } from "@/core/modules/registry";
import { usePersistentState } from "@/core/db/usePersistentState";

const STORAGE_KEY = "espou-manager-config";

interface ConfigContextValue {
  config: AppConfig;
  ready: boolean;
  updateGeneral: (patch: Partial<GeneralConfig>) => void;
  setModuleEnabled: (moduleId: string, enabled: boolean) => void;
  setModuleUserVisible: (moduleId: string, visible: boolean) => void;
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
      userVisible: true,
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
        userVisible: storedMod.userVisible ?? base.modules[id].userVisible,
        settings: { ...base.modules[id].settings, ...(storedMod.settings ?? {}) },
      };
    }
  }
  return merged;
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { state: config, mutate, ready } = usePersistentState<AppConfig>(
    STORAGE_KEY,
    buildDefaultConfig(),
    (stored) => mergeConfig(stored ?? null)
  );

  // Aplicar color de marca cuando cambia.
  useEffect(() => {
    document.documentElement.style.setProperty("--brand-color", config.general.brandColor);
  }, [config.general.brandColor]);

  const value = useMemo<ConfigContextValue>(
    () => ({
      config,
      ready,
      updateGeneral: (patch) =>
        mutate((c) => ({ ...c, general: { ...c.general, ...patch } })),
      setModuleEnabled: (moduleId, enabled) =>
        mutate((c) => ({
          ...c,
          modules: {
            ...c.modules,
            [moduleId]: { ...c.modules[moduleId], enabled },
          },
        })),
      setModuleUserVisible: (moduleId, visible) =>
        mutate((c) => ({
          ...c,
          modules: {
            ...c.modules,
            [moduleId]: { ...c.modules[moduleId], userVisible: visible },
          },
        })),
      updateModuleSettings: (moduleId, patch) =>
        mutate((c) => ({
          ...c,
          modules: {
            ...c.modules,
            [moduleId]: {
              ...c.modules[moduleId],
              settings: { ...c.modules[moduleId]?.settings, ...patch },
            },
          },
        })),
      resetAll: () => mutate(buildDefaultConfig()),
    }),
    [config, ready, mutate]
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig debe usarse dentro de <ConfigProvider>");
  return ctx;
}

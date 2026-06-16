import type { ModuleDefinition } from "./types";
import { modules } from "@/modules";

/**
 * Punto de acceso del core al conjunto de módulos.
 * El core NO importa módulos concretos: sólo consume esta lista,
 * que vive en /modules/index.ts (única lista a editar al añadir uno).
 */
export function getAllModules(): ModuleDefinition[] {
  return [...modules].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export function getModuleById(id: string): ModuleDefinition | undefined {
  return modules.find((m) => m.id === id);
}

/** Valores por defecto de los ajustes derivados del esquema del módulo. */
export function getModuleDefaultSettings(
  mod: ModuleDefinition
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of mod.settings?.fields ?? []) {
    if (field.defaultValue !== undefined) out[field.key] = field.defaultValue;
  }
  return out;
}

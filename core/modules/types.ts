import type { ComponentType } from "react";
/**
 * Tipos de campo soportados por el panel de configuración.
 * Al añadir un tipo nuevo aquí + en SettingsField.tsx, todos los
 * módulos pueden usarlo sin tocar nada más.
 */
export type SettingFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "color"
  | "time";

export interface SettingField {
  key: string;
  label: string;
  type: SettingFieldType;
  defaultValue?: string | number | boolean;
  options?: { label: string; value: string }[];
  description?: string;
  placeholder?: string;
}

export interface SettingsSchema {
  /** Secciones de ajustes; cada sección agrupa varios campos. */
  fields: SettingField[];
}

/**
 * Contrato que debe cumplir CADA módulo enchufable.
 * El core sólo conoce esta interfaz: nada más.
 */
export interface ModuleDefinition {
  /** Identificador único en minúsculas (se usa en la URL: /m/<id>). */
  id: string;
  /** Nombre visible en la navegación. */
  name: string;
  /** Descripción corta para el dashboard. */
  description?: string;
  /** Emoji o icono representativo. */
  icon: string;
  /** Orden en la barra lateral (menor = arriba). */
  order?: number;
  /** Si el módulo está activo por defecto la primera vez. */
  enabledByDefault?: boolean;
  /** Página principal del módulo (componente React). */
  Page: ComponentType;
  /** Esquema de ajustes que el panel de admin renderiza solo. */
  settings?: SettingsSchema;
  /**
   * Panel de ajustes personalizado del módulo (opcional). El panel de admin
   * lo renderiza dentro de la sección del módulo, bajo los campos del esquema.
   * Útil para gestiones que no encajan en campos simples (p. ej. subir
   * imágenes o gestionar listas).
   */
  SettingsPanel?: ComponentType;
}

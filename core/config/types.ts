import type { SettingsSchema } from "@/core/modules/types";

/** Configuración general del negocio (ajustes globales del admin). */
export interface GeneralConfig {
  businessName: string;
  tagline: string;
  brandColor: string;
  language: "es" | "ca" | "en";
  currency: string;
  timezone: string;
  logoUrl: string;
  whatsappNumber: string;
  address: string;
  openingTime: string;
  closingTime: string;
}

/** Estado de cada módulo: activado + valores de sus ajustes. */
export interface ModuleConfigState {
  enabled: boolean;
  settings: Record<string, unknown>;
}

/** Configuración completa de la app (lo que se persiste). */
export interface AppConfig {
  general: GeneralConfig;
  modules: Record<string, ModuleConfigState>;
}

export const DEFAULT_GENERAL: GeneralConfig = {
  businessName: "Mi Bar",
  tagline: "Gestión completa del local",
  brandColor: "#e11d48",
  language: "es",
  currency: "EUR",
  timezone: "Europe/Madrid",
  logoUrl: "",
  whatsappNumber: "",
  address: "",
  openingTime: "08:00",
  closingTime: "23:00",
};

/**
 * Esquema de la configuración general, renderizado por el mismo
 * componente de campos que usan los módulos (consistencia total).
 */
export const GENERAL_SCHEMA: SettingsSchema = {
  fields: [
    { key: "businessName", label: "Nombre del negocio", type: "text", placeholder: "Mi Bar" },
    { key: "tagline", label: "Eslogan", type: "text", placeholder: "Gestión completa del local" },
    { key: "brandColor", label: "Color principal", type: "color" },
    {
      key: "language",
      label: "Idioma",
      type: "select",
      options: [
        { label: "Español", value: "es" },
        { label: "Català", value: "ca" },
        { label: "English", value: "en" },
      ],
    },
    {
      key: "currency",
      label: "Moneda",
      type: "select",
      options: [
        { label: "Euro (€)", value: "EUR" },
        { label: "Dólar ($)", value: "USD" },
        { label: "Libra (£)", value: "GBP" },
      ],
    },
    { key: "timezone", label: "Zona horaria", type: "text", placeholder: "Europe/Madrid" },
    { key: "logoUrl", label: "URL del logo", type: "text", placeholder: "https://..." },
    { key: "whatsappNumber", label: "WhatsApp (con prefijo)", type: "text", placeholder: "+34600000000" },
    { key: "address", label: "Dirección", type: "textarea" },
    { key: "openingTime", label: "Hora de apertura", type: "time" },
    { key: "closingTime", label: "Hora de cierre", type: "time" },
  ],
};

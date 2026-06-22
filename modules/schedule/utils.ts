import type { Shift } from "./types";
import { addDays, formatHours, getWeekStart, toISODate, todayISO, WEEKDAYS_SHORT } from "@/core/util/datetime";
import { uid } from "@/core/util/id";

export { addDays, formatHours, getWeekStart, toISODate, todayISO, uid };

/** Nombres cortos de los días (Lun…Dom). */
export const DAY_NAMES = WEEKDAYS_SHORT;

/** Los 7 días (ISO) de la semana a partir del lunes. */
export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function weekLabel(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const fmt = (s: string) => {
    const d = new Date(s + "T00:00:00");
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

export function dayNumber(iso: string): string {
  return String(new Date(iso + "T00:00:00").getDate());
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Etiqueta de rango con meses, p. ej. «16 – 22 jun 2026». */
export function weekRangeLabel(weekStart: string): string {
  const a = new Date(weekStart + "T00:00:00");
  const b = new Date(addDays(weekStart, 6) + "T00:00:00");
  const da = a.getDate();
  const db = b.getDate();
  const ma = MONTHS[a.getMonth()];
  const mb = MONTHS[b.getMonth()];
  const year = b.getFullYear();
  return a.getMonth() === b.getMonth()
    ? `${da} – ${db} ${mb} ${year}`
    : `${da} ${ma} – ${db} ${mb} ${year}`;
}

/** ¿La fecha cae en fin de semana (sáb/dom)? */
export function isWeekend(iso: string): boolean {
  const idx = (new Date(iso + "T00:00:00").getDay() + 6) % 7;
  return idx >= 5;
}

/** Plantillas de turno para asignación rápida. */
export interface ShiftPreset {
  label: string;
  start: string;
  end: string;
  color: string;
}

export const SHIFT_PRESETS: ShiftPreset[] = [
  { label: "Mañana", start: "09:00", end: "17:00", color: "#2563eb" },
  { label: "Tarde", start: "16:00", end: "00:00", color: "#d97706" },
  { label: "Noche", start: "20:00", end: "04:00", color: "#7c3aed" },
  { label: "Refuerzo", start: "12:00", end: "16:00", color: "#16a34a" },
];

/** Horas de un turno (soporta cruce de medianoche). */
export function shiftHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  return Math.round((minutes / 60) * 100) / 100;
}

export function shiftDuration(s: Shift): number {
  return shiftHours(s.start, s.end);
}

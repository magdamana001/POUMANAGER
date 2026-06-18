import type { Shift } from "./types";

export const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Lunes (YYYY-MM-DD) de la semana que contiene la fecha dada. */
export function getWeekStart(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return toISODate(d);
}

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

export function formatHours(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0 && m === 0) return "0h";
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

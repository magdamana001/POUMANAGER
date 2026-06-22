import type { DayDetail, Employee, WeeklyResult, WorkSession } from "./types";
import { addDays, formatHours, getWeekStart, toISODate, todayISO, WEEKDAYS_SHORT } from "@/core/util/datetime";
import { uid } from "@/core/util/id";
import { currencySymbol, formatMoney } from "@/core/util/format";

export { addDays, formatHours, getWeekStart, toISODate, todayISO, uid, currencySymbol, formatMoney };

/** Nombres cortos de los días (Lun…Dom). */
export const DAY_NAMES = WEEKDAYS_SHORT;

function hm(value: string): number | null {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/** Hora actual en formato HH:MM. */
export function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** ¿La jornada está en curso (sin hora de salida)? */
export function isOpen(s: WorkSession): boolean {
  return !s.end;
}

/** Minutos brutos de una sesión (soporta turnos que cruzan medianoche). */
export function grossMinutes(s: WorkSession): number {
  const start = hm(s.start);
  const end = hm(s.end);
  if (start === null || end === null) return 0;
  let minutes = end - start;
  if (minutes < 0) minutes += 24 * 60;
  return minutes;
}

/**
 * Horas netas de una sesión (resta pausa y aplica redondeo opcional).
 * Las jornadas en curso devuelven 0 (no cuentan hasta cerrarse).
 */
export function sessionNetHours(s: WorkSession, roundingMinutes = 0): number {
  if (isOpen(s)) return 0;
  let minutes = grossMinutes(s) - (s.breakMinutes ?? 0);
  if (minutes < 0) minutes = 0;
  if (roundingMinutes > 0) {
    minutes = Math.round(minutes / roundingMinutes) * roundingMinutes;
  }
  return Math.round((minutes / 60) * 100) / 100;
}

/** Minutos transcurridos de una jornada en curso hasta ahora. */
export function liveMinutes(s: WorkSession): number {
  const start = hm(s.start);
  if (start === null) return 0;
  const now = new Date();
  let minutes = now.getHours() * 60 + now.getMinutes() - start;
  if (minutes < 0) minutes += 24 * 60;
  return minutes;
}

/** Devuelve el lunes (YYYY-MM-DD) de la semana que contiene la fecha dada. (compartida en core)
 *  Se mantiene aquí solo la lógica específica del módulo. */

/** Etiqueta legible del rango de la semana. */
export function weekLabel(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const fmt = (s: string) => {
    const d = new Date(s + "T00:00:00");
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  return `${fmt(weekStart)} – ${fmt(end)}/${new Date(weekStart + "T00:00:00").getFullYear()}`;
}

/** Formatea minutos como "1h 05m". */
export function formatMinutes(min: number): string {
  return formatHours(min / 60);
}

/** Calcula el resumen semanal de un empleado a partir de sus sesiones. */
export function computeWeekly(
  employee: Employee,
  sessions: WorkSession[],
  weekStart: string,
  roundingMinutes = 0
): WeeklyResult {
  // Agrupa las sesiones cerradas por día de la semana.
  const byDay: WorkSession[][] = [[], [], [], [], [], [], []];
  let sessionCount = 0;
  for (const s of sessions) {
    if (s.employeeId !== employee.id) continue;
    if (getWeekStart(s.date) !== weekStart) continue;
    if (isOpen(s)) continue;
    sessionCount++;
    const idx = (new Date(s.date + "T00:00:00").getDay() + 6) % 7;
    byDay[idx].push(s);
  }

  const days: DayDetail[] = byDay.map((list, dayIndex) => {
    const segments = list
      .slice()
      .sort((a, b) => (a.start < b.start ? -1 : 1))
      .map((s) => ({
        start: s.start,
        end: s.end,
        net: sessionNetHours(s, roundingMinutes),
      }));
    const total = Math.round(segments.reduce((a, x) => a + x.net, 0) * 100) / 100;
    return {
      dayIndex,
      date: addDays(weekStart, dayIndex),
      segments,
      total,
      isSplit: segments.length > 1, // detección automática de jornada partida
    };
  });

  const perDay = days.map((d) => d.total);
  const totalHours = Math.round(perDay.reduce((a, b) => a + b, 0) * 100) / 100;
  const normalHours = Math.min(totalHours, employee.contractHours);
  const extraHours = Math.round(Math.max(0, totalHours - employee.contractHours) * 100) / 100;
  const extraPay = extraHours * employee.extraHourPrice;
  return {
    employee,
    weekStart,
    days,
    perDay,
    totalHours,
    normalHours,
    extraHours,
    extraPay,
    totalPay: extraPay,
    sessionCount,
  };
}

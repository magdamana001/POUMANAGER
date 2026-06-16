import type { Employee, WeeklyResult, WorkSession } from "./types";

export const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Genera un id simple y único. */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Horas trabajadas en una sesión (soporta turnos que cruzan medianoche). */
export function sessionHours(session: WorkSession): number {
  const [sh, sm] = session.start.split(":").map(Number);
  const [eh, em] = session.end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60; // cruza medianoche
  return Math.round((minutes / 60) * 100) / 100;
}

/** Devuelve el lunes (YYYY-MM-DD) de la semana que contiene la fecha dada. */
export function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - day);
  return toISODate(d);
}

/** Fecha actual en formato YYYY-MM-DD (hora local). */
export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Suma días a una fecha YYYY-MM-DD. */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Etiqueta legible del rango de la semana. */
export function weekLabel(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const fmt = (s: string) => {
    const d = new Date(s + "T00:00:00");
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  return `${fmt(weekStart)} – ${fmt(end)}/${new Date(weekStart + "T00:00:00").getFullYear()}`;
}

/** Formatea horas decimales como "8h 30m". */
export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Símbolo de la moneda configurada. */
export function currencySymbol(currency: string): string {
  return { EUR: "€", USD: "$", GBP: "£" }[currency] ?? currency;
}

export function formatMoney(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currencySymbol(currency)}`;
}

/**
 * Calcula el resumen semanal de un empleado a partir de sus sesiones.
 */
export function computeWeekly(
  employee: Employee,
  sessions: WorkSession[],
  weekStart: string
): WeeklyResult {
  const perDay = [0, 0, 0, 0, 0, 0, 0];
  for (const s of sessions) {
    if (s.employeeId !== employee.id) continue;
    if (getWeekStart(s.date) !== weekStart) continue;
    const idx = (new Date(s.date + "T00:00:00").getDay() + 6) % 7;
    perDay[idx] += sessionHours(s);
  }
  const totalHours = Math.round(perDay.reduce((a, b) => a + b, 0) * 100) / 100;
  const normalHours = Math.min(totalHours, employee.contractHours);
  const extraHours = Math.max(0, totalHours - employee.contractHours);
  const extraPay = extraHours * employee.extraHourPrice;
  return {
    employee,
    weekStart,
    perDay,
    totalHours,
    normalHours,
    extraHours,
    extraPay,
    totalPay: extraPay,
  };
}

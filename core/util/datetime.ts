/** Utilidades de fecha/hora compartidas por los módulos. */

export const WEEKDAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Fecha como YYYY-MM-DD (hora local). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Fecha de hoy como YYYY-MM-DD. */
export function todayISO(): string {
  return toISODate(new Date());
}

/** Suma días a una fecha YYYY-MM-DD. */
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Lunes (YYYY-MM-DD) de la semana que contiene la fecha dada. */
export function getWeekStart(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const day = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - day);
  return toISODate(d);
}

/** Formatea horas decimales como "8h 30m". */
export function formatHours(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0 && m === 0) return "0h";
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

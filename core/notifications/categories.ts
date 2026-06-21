/**
 * Categorías, plantillas y utilidades de recordatorios.
 * TS puro (sin React ni APIs de navegador): se puede importar tanto desde
 * componentes cliente como desde las rutas API del servidor.
 */

export interface NotifCategory {
  id: string;
  name: string;
  icon: string;
  /** Color de acento (hex) para badges y bordes. */
  color: string;
}

export const CATEGORIES: NotifCategory[] = [
  { id: "fichaje", name: "Fichaje", icon: "🕐", color: "#6366f1" },
  { id: "pedidos", name: "Pedidos", icon: "📦", color: "#f59e0b" },
  { id: "stock", name: "Stock", icon: "📊", color: "#10b981" },
  { id: "limpieza", name: "Limpieza", icon: "🧹", color: "#06b6d4" },
  { id: "caja", name: "Caja", icon: "💰", color: "#84cc16" },
  { id: "personal", name: "Personal", icon: "👥", color: "#ec4899" },
  { id: "general", name: "General", icon: "🔔", color: "#64748b" },
];

export const DEFAULT_CATEGORY = "general";

export function getCategory(id: string | undefined): NotifCategory {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function categoryIcon(id: string | undefined): string {
  return getCategory(id).icon;
}

/** Plantillas rápidas típicas de un bar/restaurante. */
export interface ReminderPreset {
  category: string;
  title: string;
  label: string;
  time: string;
  days: number[];
}

const L_V = [0, 1, 2, 3, 4];
const ALL = [0, 1, 2, 3, 4, 5, 6];

export const PRESETS: ReminderPreset[] = [
  { category: "fichaje", title: "Fichar entrada", label: "Recuerda fichar tu entrada", time: "09:00", days: L_V },
  { category: "fichaje", title: "Fichar salida", label: "Recuerda fichar tu salida", time: "18:00", days: L_V },
  { category: "pedidos", title: "Pedidos a proveedores", label: "Revisar y enviar los pedidos del día", time: "10:00", days: [0, 2, 4] },
  { category: "stock", title: "Control de stock", label: "Revisar stock y puntos de pedido", time: "11:00", days: [0] },
  { category: "caja", title: "Cuadrar caja", label: "Cuadre de caja del cierre", time: "23:30", days: ALL },
  { category: "limpieza", title: "Limpieza y cierre", label: "Tareas de limpieza antes de cerrar", time: "23:00", days: ALL },
];

/** Atajos de selección de días. */
export const DAY_SHORTCUTS: { label: string; days: number[] }[] = [
  { label: "L-V", days: L_V },
  { label: "Findes", days: [5, 6] },
  { label: "Todos", days: ALL },
];

export function sameDays(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((d) => s.has(d));
}

const WEEKDAYS_LONG = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

interface SchedulableLike {
  time: string;
  days: number[];
  enabled: boolean;
}

/** Próxima fecha/hora en que se dispararía el recordatorio (o null). */
export function nextOccurrence(r: SchedulableLike, from: Date = new Date()): Date | null {
  if (!r.enabled || !r.days || r.days.length === 0) return null;
  const [h, m] = r.time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  for (let i = 0; i < 8; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    d.setHours(h, m, 0, 0);
    const idx = (d.getDay() + 6) % 7;
    if (r.days.includes(idx) && d.getTime() > from.getTime()) return d;
  }
  return null;
}

/** Texto relativo amable: «hoy a las 09:00», «mañana…», «el miércoles…». */
export function formatNext(r: SchedulableLike, from: Date = new Date()): string | null {
  const next = nextOccurrence(r, from);
  if (!next) return null;
  const hhmm = next.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(next) - startOfDay(from)) / 86400000);
  if (diffDays === 0) return `hoy a las ${hhmm}`;
  if (diffDays === 1) return `mañana a las ${hhmm}`;
  const idx = (next.getDay() + 6) % 7;
  return `el ${WEEKDAYS_LONG[idx]} a las ${hhmm}`;
}

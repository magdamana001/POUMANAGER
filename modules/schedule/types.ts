/** Turno planificado de un empleado. */
export interface Shift {
  id: string;
  employeeId: string;
  /** Fecha YYYY-MM-DD. */
  date: string;
  /** Hora de inicio HH:MM. */
  start: string;
  /** Hora de fin HH:MM. */
  end: string;
  /** Etiqueta opcional (mañana, tarde, cocina…). */
  role?: string;
  /** Color del turno (por defecto el del empleado). */
  color?: string;
  note?: string;
}

export interface ScheduleData {
  shifts: Shift[];
}

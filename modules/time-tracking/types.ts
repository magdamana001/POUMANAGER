/** Ficha completa de empleado. */
export interface Employee {
  id: string;
  name: string;
  /** Puesto de trabajo (camarero, cocina, etc.). */
  position: string;
  /** Teléfono de contacto. */
  phone: string;
  /** Email de contacto. */
  email: string;
  /** Horas semanales según contrato. */
  contractHours: number;
  /** Precio por hora extra (solo se pagan las extras). */
  extraHourPrice: number;
  /** Fecha de alta (YYYY-MM-DD). */
  startDate: string;
  /** Si está activo (los inactivos no aparecen en fichaje). */
  active: boolean;
  /** Notas internas. */
  notes: string;
  /** Color identificativo en listados. */
  color: string;
}

/** Registro de una jornada trabajada. */
export interface WorkSession {
  id: string;
  employeeId: string;
  /** Fecha en formato YYYY-MM-DD. */
  date: string;
  /** Hora de entrada HH:MM. */
  start: string;
  /** Hora de salida HH:MM. Vacío ("") = jornada en curso. */
  end: string;
  /** Minutos de pausa (descanso) que se descuentan. */
  breakMinutes?: number;
  /** Nota opcional. */
  note?: string;
}

/** Datos persistidos del módulo. */
export interface TimeTrackingData {
  employees: Employee[];
  sessions: WorkSession[];
}

/** Un tramo trabajado (entrada–salida) dentro de un día. */
export interface DaySegment {
  start: string;
  end: string;
  net: number;
}

/** Detalle de un día de la semana con sus tramos. */
export interface DayDetail {
  /** 0 = lunes … 6 = domingo. */
  dayIndex: number;
  /** Fecha YYYY-MM-DD. */
  date: string;
  /** Tramos trabajados (1 = jornada continua, 2+ = partida). */
  segments: DaySegment[];
  /** Horas netas totales del día. */
  total: number;
  /** Detección automática de jornada partida. */
  isSplit: boolean;
}

/** Resultado del cálculo de un periodo (semana) para un empleado. */
export interface WeeklyResult {
  employee: Employee;
  /** Lunes de la semana (YYYY-MM-DD). */
  weekStart: string;
  /** Detalle por día (índice 0 = lunes). */
  days: DayDetail[];
  /** Horas por día de la semana (índice 0 = lunes). */
  perDay: number[];
  /** Total de horas netas trabajadas. */
  totalHours: number;
  /** Horas dentro del contrato (no se pagan). */
  normalHours: number;
  /** Horas extra (por encima del contrato). */
  extraHours: number;
  /** Importe de las horas extra. */
  extraPay: number;
  /** Importe total a pagar (solo horas extra). */
  totalPay: number;
  /** Nº de jornadas registradas en la semana. */
  sessionCount: number;
}

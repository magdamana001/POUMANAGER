/** Ficha de empleado. */
export interface Employee {
  id: string;
  name: string;
  /** Puesto de trabajo (camarero, cocina, etc.). */
  position: string;
  /** Horas semanales según contrato. */
  contractHours: number;
  /** Precio por hora extra (solo se pagan las extras). */
  extraHourPrice: number;
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
  /** Hora de salida HH:MM. */
  end: string;
  /** Nota opcional. */
  note?: string;
}

/** Datos persistidos del módulo. */
export interface TimeTrackingData {
  employees: Employee[];
  sessions: WorkSession[];
}

/** Resultado del cálculo semanal de un empleado. */
export interface WeeklyResult {
  employee: Employee;
  /** Lunes de la semana (YYYY-MM-DD). */
  weekStart: string;
  /** Horas por día de la semana (índice 0 = lunes). */
  perDay: number[];
  /** Total de horas trabajadas. */
  totalHours: number;
  /** Horas dentro del contrato (no se pagan). */
  normalHours: number;
  /** Horas extra (por encima del contrato). */
  extraHours: number;
  /** Importe de las horas extra. */
  extraPay: number;
  /** Importe total a pagar (solo horas extra). */
  totalPay: number;
}

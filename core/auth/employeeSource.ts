/**
 * Punto de desacople entre el sistema de cuentas (core) y los empleados, que
 * son un concepto de un módulo (time-tracking). El core NO conoce el módulo:
 * solo define esta abstracción. El módulo que tenga empleados se "registra"
 * aquí mediante `registerEmployeeSource`, y el core la consume si existe.
 */

export interface LinkableEmployee {
  id: string;
  name: string;
  position?: string;
}

export interface EmployeeSource {
  /** Hook único: lista de empleados (sincronizada) + función para crear uno. */
  useEmployees: () => { ready: boolean; employees: LinkableEmployee[]; add: (name: string) => string };
}

/** Fuente "vacía" por defecto: permite llamar al hook sin romper si no hay módulo de empleados. */
const NULL_SOURCE: EmployeeSource = {
  useEmployees: () => ({ ready: true, employees: [], add: () => "" }),
};

let source: EmployeeSource = NULL_SOURCE;
let registered = false;

export function registerEmployeeSource(s: EmployeeSource): void {
  source = s;
  registered = true;
}

export function getEmployeeSource(): EmployeeSource {
  return source;
}

/** Indica si algún módulo aportó una fuente real de empleados. */
export function hasEmployeeSource(): boolean {
  return registered;
}

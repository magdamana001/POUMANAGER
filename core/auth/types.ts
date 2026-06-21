export type Role = "admin" | "user";

export interface Account {
  id: string;
  username: string;
  role: Role;
  salt: string;
  hash: string;
  createdAt: number;
  /** Empleado vinculado (id del módulo de empleados), opcional. */
  employeeId?: string;
}

export interface AuthData {
  accounts: Account[];
}

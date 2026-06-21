"use client";

import { useMemo, useState } from "react";
import { useAuth } from "./store";
import type { Role } from "./types";
import { getEmployeeSource, hasEmployeeSource } from "./employeeSource";

const ROLE_LABEL: Record<Role, string> = { admin: "Administrador", user: "Usuario" };
const NEW = "__new__";
const NONE = "__none__";

export function UsersSettings() {
  const { accounts, currentUser, isAdmin, createAccount, setRole, setEmployee, changePassword, removeAccount } = useAuth();

  const source = getEmployeeSource();
  const hasEmployees = hasEmployeeSource();
  const { employees, add: addEmployee } = source.useEmployees();

  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [role, setRole2] = useState<Role>("user");
  const [link, setLink] = useState<string>(NONE); // NONE | NEW | <employeeId>
  const [newEmpName, setNewEmpName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pwEdit, setPwEdit] = useState<{ id: string; value: string } | null>(null);

  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  // Empleados ya vinculados a otra cuenta (para no duplicar enlaces).
  const takenByOthers = useMemo(
    () => new Set(accounts.map((a) => a.employeeId).filter(Boolean) as string[]),
    [accounts]
  );

  if (!isAdmin) {
    return (
      <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
        Solo un administrador puede gestionar las cuentas. Has iniciado sesión como <strong>{currentUser?.username}</strong> ({currentUser ? ROLE_LABEL[currentUser.role] : ""}).
      </p>
    );
  }

  const resetForm = () => {
    setName("");
    setPass("");
    setRole2("user");
    setLink(NONE);
    setNewEmpName("");
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    let employeeId: string | undefined;
    if (link === NEW) employeeId = addEmployee(newEmpName.trim() || name.trim());
    else if (link !== NONE) employeeId = link;
    const res = await createAccount(name, pass, role, employeeId);
    if (!res.ok) setError(res.error ?? "No se pudo crear.");
    else resetForm();
    setBusy(false);
  };

  const savePw = async () => {
    if (!pwEdit) return;
    setBusy(true);
    setError(null);
    const res = await changePassword(pwEdit.id, pwEdit.value);
    if (!res.ok) setError(res.error ?? "No se pudo cambiar.");
    else setPwEdit(null);
    setBusy(false);
  };

  const onDelete = (id: string) => {
    if (!confirm("¿Eliminar esta cuenta? El empleado vinculado y sus datos NO se eliminan.")) return;
    const res = removeAccount(id);
    if (!res.ok) alert(res.error);
  };

  /** Reasigna empleado a una cuenta (existente, nuevo o ninguno). */
  const reassign = (accountId: string, value: string, fallbackName: string) => {
    if (value === NEW) {
      const id = addEmployee(fallbackName);
      setEmployee(accountId, id);
    } else if (value === NONE) {
      setEmployee(accountId, undefined);
    } else {
      setEmployee(accountId, value);
    }
  };

  const input = "rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";

  return (
    <div className="space-y-5">
      {/* Crear cuenta */}
      <div className="rounded-xl border border-neutral-200 p-4">
        <p className="mb-3 text-sm font-semibold">Crear cuenta</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input className={input} placeholder="Usuario" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={input} type="password" placeholder="Contraseña" value={pass} onChange={(e) => setPass(e.target.value)} />
          <select className={input} value={role} onChange={(e) => setRole2(e.target.value as Role)}>
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        {/* Empleado vinculado */}
        {hasEmployees && (
          <div className="mt-2 grid gap-2 sm:grid-cols-[auto_1fr]">
            <label className="flex items-center text-xs font-medium text-neutral-500">Empleado vinculado</label>
            <div className="flex flex-wrap gap-2">
              <select className={`${input} flex-1`} value={link} onChange={(e) => setLink(e.target.value)}>
                <option value={NONE}>Sin empleado</option>
                <option value={NEW}>➕ Crear empleado nuevo</option>
                <optgroup label="Empleados existentes">
                  {employees.map((e) => (
                    <option key={e.id} value={e.id} disabled={takenByOthers.has(e.id)}>
                      {e.name}{e.position ? ` · ${e.position}` : ""}{takenByOthers.has(e.id) ? " (ya vinculado)" : ""}
                    </option>
                  ))}
                </optgroup>
              </select>
              {link === NEW && (
                <input
                  className={`${input} flex-1`}
                  placeholder="Nombre del empleado (por defecto, el usuario)"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                />
              )}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-neutral-400">
            {hasEmployees ? "Vincula la cuenta a un empleado existente (conserva sus datos) o crea uno nuevo." : ""}
          </p>
          <button
            onClick={create}
            disabled={busy || !name || !pass}
            className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            Crear cuenta
          </button>
        </div>
        {error && <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      </div>

      {/* Lista de cuentas */}
      <ul className="space-y-2">
        {accounts.map((a) => {
          const emp = a.employeeId ? empById.get(a.employeeId) : undefined;
          return (
            <li key={a.id} className="rounded-xl border border-neutral-200 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold">
                  {a.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {a.username}
                    {a.id === currentUser?.id && <span className="ml-2 text-xs text-neutral-400">(tú)</span>}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {ROLE_LABEL[a.role]}
                    {hasEmployees && (
                      <> · {emp ? `👤 ${emp.name}` : a.employeeId ? "empleado no encontrado" : "sin empleado"}</>
                    )}
                  </p>
                </div>
                <select
                  className={`${input} py-1`}
                  value={a.role}
                  onChange={(e) => setRole(a.id, e.target.value as Role)}
                >
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
                <button
                  onClick={() => setPwEdit(pwEdit?.id === a.id ? null : { id: a.id, value: "" })}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-100"
                >
                  🔑 Contraseña
                </button>
                <button
                  onClick={() => onDelete(a.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>

              {/* Reasignar empleado */}
              {hasEmployees && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                  <span className="text-xs font-medium text-neutral-500">Empleado:</span>
                  <select
                    className={`${input} py-1`}
                    value={a.employeeId ?? NONE}
                    onChange={(e) => reassign(a.id, e.target.value, a.username)}
                  >
                    <option value={NONE}>Sin empleado</option>
                    <option value={NEW}>➕ Crear empleado nuevo</option>
                    <optgroup label="Empleados existentes">
                      {employees.map((e) => (
                        <option key={e.id} value={e.id} disabled={takenByOthers.has(e.id) && e.id !== a.employeeId}>
                          {e.name}{takenByOthers.has(e.id) && e.id !== a.employeeId ? " (ya vinculado)" : ""}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}

              {pwEdit?.id === a.id && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                  <input
                    className={`${input} flex-1`}
                    type="password"
                    placeholder="Nueva contraseña"
                    value={pwEdit.value}
                    onChange={(e) => setPwEdit({ id: a.id, value: e.target.value })}
                  />
                  <button onClick={savePw} disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                    Guardar
                  </button>
                  <button onClick={() => setPwEdit(null)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100">
                    Cancelar
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

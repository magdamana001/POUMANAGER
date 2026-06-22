"use client";

import { useState } from "react";
import { useAuth } from "./store";
import { getEmployeeSource, hasEmployeeSource } from "./employeeSource";

/** Panel "Mi cuenta": información del usuario y cambio de su propia contraseña. */
export function ProfileSettings() {
  const { currentUser, changeOwnPassword } = useAuth();
  const hasEmployees = hasEmployeeSource();
  const { employees } = getEmployeeSource().useEmployees();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!currentUser) return null;

  const emp = currentUser.employeeId ? employees.find((e) => e.id === currentUser.employeeId) : undefined;

  const submit = async () => {
    setMsg(null);
    if (next !== repeat) {
      setMsg({ ok: false, text: "La nueva contraseña y su repetición no coinciden." });
      return;
    }
    setBusy(true);
    const res = await changeOwnPassword(current, next);
    if (res.ok) {
      setMsg({ ok: true, text: "Contraseña actualizada correctamente." });
      setCurrent("");
      setNext("");
      setRepeat("");
    } else {
      setMsg({ ok: false, text: res.error ?? "No se pudo cambiar." });
    }
    setBusy(false);
  };

  const input = "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";

  return (
    <div className="space-y-6">
      {/* Información del usuario */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Mi cuenta</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-xl font-bold text-white">
            {currentUser.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{currentUser.username}</p>
            <p className="text-sm text-neutral-500">{currentUser.role === "admin" ? "Administrador" : "Usuario"}</p>
          </div>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-neutral-50 px-4 py-3">
            <dt className="text-xs text-neutral-400">Rol</dt>
            <dd className="text-sm font-medium">{currentUser.role === "admin" ? "Administrador" : "Usuario"}</dd>
          </div>
          {hasEmployees && (
            <div className="rounded-xl bg-neutral-50 px-4 py-3">
              <dt className="text-xs text-neutral-400">Empleado vinculado</dt>
              <dd className="text-sm font-medium">{emp ? `👤 ${emp.name}` : "Sin empleado"}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Cambiar contraseña */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">Cambiar contraseña</h2>
        <p className="mb-4 text-sm text-neutral-500">Introduce tu contraseña actual y la nueva.</p>
        <div className="grid max-w-md gap-3">
          <input className={input} type="password" placeholder="Contraseña actual" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          <input className={input} type="password" placeholder="Nueva contraseña" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          <input className={input} type="password" placeholder="Repite la nueva contraseña" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" />
          {msg && (
            <p className={`rounded-lg px-3 py-2 text-xs ${msg.ok ? "border border-green-200 bg-green-50 text-green-700" : "border border-red-200 bg-red-50 text-red-700"}`}>
              {msg.text}
            </p>
          )}
          <button
            onClick={submit}
            disabled={busy || !current || !next}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Cambiar contraseña"}
          </button>
        </div>
      </div>
    </div>
  );
}

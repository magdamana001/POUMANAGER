"use client";

import { useState } from "react";
import { useConfig } from "@/core/config/ConfigProvider";
import { useAuth } from "./store";

export function LoginScreen() {
  const { config } = useConfig();
  const { needsSetup, login, createAccount } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = needsSetup
        ? await createAccount(username, password, "admin")
        : await login(username, password);
      if (!res.ok) setError(res.error ?? "No se pudo continuar.");
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm focus:border-brand focus:outline-none";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          {config.general.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.general.logoUrl} alt="logo" className="h-16 w-16 rounded-2xl object-cover shadow" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-white shadow">
              {config.general.businessName.charAt(0) || "B"}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{config.general.businessName || "Espou Manager"}</h1>
            <p className="text-sm text-neutral-500">
              {needsSetup ? "Crea la cuenta de administrador" : "Inicia sesión para continuar"}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          {needsSetup && (
            <p className="rounded-xl bg-brand/10 px-3 py-2 text-xs text-neutral-600">
              Es el primer acceso. La cuenta que crees será <strong>administrador</strong> e iniciarás sesión automáticamente.
            </p>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-500">Usuario</span>
            <input
              className={input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              placeholder="nombre de usuario"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-500">Contraseña</span>
            <input
              type="password"
              className={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={needsSetup ? "new-password" : "current-password"}
              placeholder="••••••••"
            />
          </label>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={busy || !username || !password}
            className="w-full rounded-xl bg-brand py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "…" : needsSetup ? "Crear administrador" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

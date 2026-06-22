"use client";

import type { ReactNode } from "react";
import { useAuth } from "./store";
import { LoginScreen } from "./LoginScreen";

/**
 * Puerta de acceso: muestra la app solo si hay sesión iniciada.
 * Mientras carga las cuentas, muestra un indicador. Si no hay cuentas, la
 * pantalla de login ofrece crear el primer administrador.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { ready, currentUser } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-neutral-100">
        <p className="animate-pulse text-sm text-neutral-400">Cargando…</p>
      </div>
    );
  }

  if (!currentUser) return <LoginScreen />;

  return <>{children}</>;
}

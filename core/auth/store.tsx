"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePersistentState } from "@/core/db/usePersistentState";
import { genSalt, hashPassword, uid } from "./crypto";
import type { Account, AuthData, Role } from "./types";

const STORAGE_KEY = "espou-auth";
const SESSION_KEY = "espou-auth-session";
const DEFAULTS: AuthData = { accounts: [] };

function normalize(stored: AuthData | undefined): AuthData {
  if (!stored) return DEFAULTS;
  return {
    accounts: (stored.accounts ?? []).map((a) => ({
      id: a.id,
      username: a.username ?? "",
      role: (a.role as Role) ?? "user",
      salt: a.salt ?? "",
      hash: a.hash ?? "",
      createdAt: a.createdAt ?? 0,
      employeeId: a.employeeId,
    })),
  };
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

interface AuthValue {
  ready: boolean;
  accounts: Account[];
  currentUser: Account | null;
  isAdmin: boolean;
  /** No hay ninguna cuenta todavía: hay que crear el primer administrador. */
  needsSetup: boolean;
  login: (username: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  createAccount: (username: string, password: string, role: Role, employeeId?: string) => Promise<AuthResult>;
  setRole: (id: string, role: Role) => void;
  setEmployee: (id: string, employeeId: string | undefined) => void;
  changePassword: (id: string, password: string) => Promise<AuthResult>;
  changeOwnPassword: (current: string, next: string) => Promise<AuthResult>;
  removeAccount: (id: string) => AuthResult;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { state, mutate, ready } = usePersistentState<AuthData>(STORAGE_KEY, DEFAULTS, normalize);
  const [userId, setUserId] = useState<string | null>(null);

  // Restaura la sesión del dispositivo al cargar.
  useEffect(() => {
    try {
      setUserId(localStorage.getItem(SESSION_KEY));
    } catch {
      /* ignore */
    }
  }, []);

  const currentUser = useMemo(
    () => (ready ? state.accounts.find((a) => a.id === userId) ?? null : null),
    [ready, state.accounts, userId]
  );

  const persistSession = (id: string | null) => {
    setUserId(id);
    try {
      if (id) localStorage.setItem(SESSION_KEY, id);
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  };

  const value = useMemo<AuthValue>(() => {
    const findByName = (name: string) =>
      state.accounts.find((a) => a.username.trim().toLowerCase() === name.trim().toLowerCase());

    return {
      ready,
      accounts: state.accounts,
      currentUser,
      isAdmin: currentUser?.role === "admin",
      needsSetup: ready && state.accounts.length === 0,

      login: async (username, password) => {
        const acc = findByName(username);
        if (!acc) return { ok: false, error: "Usuario o contraseña incorrectos." };
        const hash = await hashPassword(password, acc.salt);
        if (hash !== acc.hash) return { ok: false, error: "Usuario o contraseña incorrectos." };
        persistSession(acc.id);
        return { ok: true };
      },

      logout: () => persistSession(null),

      createAccount: async (username, password, role, employeeId) => {
        const name = username.trim();
        if (name.length < 2) return { ok: false, error: "El usuario debe tener al menos 2 caracteres." };
        if (password.length < 4) return { ok: false, error: "La contraseña debe tener al menos 4 caracteres." };
        if (findByName(name)) return { ok: false, error: "Ya existe un usuario con ese nombre." };
        const salt = genSalt();
        const hash = await hashPassword(password, salt);
        const account: Account = { id: uid(), username: name, role, salt, hash, createdAt: Date.now(), employeeId };
        const firstEver = state.accounts.length === 0;
        mutate((d) => ({ ...d, accounts: [...d.accounts, account] }));
        // Si es la primera cuenta, inicia sesión automáticamente.
        if (firstEver) persistSession(account.id);
        return { ok: true };
      },

      setRole: (id, role) => {
        // Evita quedarse sin ningún administrador.
        const admins = state.accounts.filter((a) => a.role === "admin");
        if (role === "user" && admins.length === 1 && admins[0].id === id) return;
        mutate((d) => ({ ...d, accounts: d.accounts.map((a) => (a.id === id ? { ...a, role } : a)) }));
      },

      setEmployee: (id, employeeId) =>
        mutate((d) => ({ ...d, accounts: d.accounts.map((a) => (a.id === id ? { ...a, employeeId } : a)) })),

      changePassword: async (id, password) => {
        if (password.length < 4) return { ok: false, error: "La contraseña debe tener al menos 4 caracteres." };
        const salt = genSalt();
        const hash = await hashPassword(password, salt);
        mutate((d) => ({ ...d, accounts: d.accounts.map((a) => (a.id === id ? { ...a, salt, hash } : a)) }));
        return { ok: true };
      },

      changeOwnPassword: async (current, next) => {
        if (!currentUser) return { ok: false, error: "No has iniciado sesión." };
        if (next.length < 4) return { ok: false, error: "La nueva contraseña debe tener al menos 4 caracteres." };
        const currentHash = await hashPassword(current, currentUser.salt);
        if (currentHash !== currentUser.hash) return { ok: false, error: "La contraseña actual no es correcta." };
        const salt = genSalt();
        const hash = await hashPassword(next, salt);
        mutate((d) => ({ ...d, accounts: d.accounts.map((a) => (a.id === currentUser.id ? { ...a, salt, hash } : a)) }));
        return { ok: true };
      },

      removeAccount: (id) => {
        const admins = state.accounts.filter((a) => a.role === "admin");
        const target = state.accounts.find((a) => a.id === id);
        if (target?.role === "admin" && admins.length === 1) {
          return { ok: false, error: "No puedes eliminar el único administrador." };
        }
        mutate((d) => ({ ...d, accounts: d.accounts.filter((a) => a.id !== id) }));
        if (id === userId) persistSession(null);
        return { ok: true };
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state, currentUser, userId, mutate]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

"use client";

import Link from "next/link";
import { useConfig } from "@/core/config/ConfigProvider";
import { getAllModules } from "@/core/modules/registry";
import { useAuth } from "@/core/auth/store";

export default function DashboardPage() {
  const { config } = useConfig();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const modules = getAllModules().filter((m) => {
    const st = config.modules[m.id];
    if (!st?.enabled) return false;
    if (isAdmin) return true;
    return st.userVisible !== false;
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Hola, {config.general.businessName} 👋</h1>
        <p className="text-neutral-500">Panel de control. Elige un módulo para empezar.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.id}
            href={`/m/${m.id}`}
            className="group rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-brand hover:shadow-md"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-soft text-2xl">
              {m.icon}
            </div>
            <h2 className="font-semibold group-hover:text-brand">{m.name}</h2>
            <p className="mt-1 text-sm text-neutral-500">{m.description}</p>
          </Link>
        ))}

        {modules.length === 0 && (
          <p className="text-sm text-neutral-400">
            No hay módulos activos. Actívalos en{" "}
            <Link href="/admin" className="text-brand underline">
              Configuración
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}

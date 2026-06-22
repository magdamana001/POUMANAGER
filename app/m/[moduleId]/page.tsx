"use client";

import { use } from "react";
import Link from "next/link";
import { useConfig } from "@/core/config/ConfigProvider";
import { getModuleById } from "@/core/modules/registry";
import { useAuth } from "@/core/auth/store";

export default function ModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = use(params);
  const { config, ready } = useConfig();
  const { currentUser } = useAuth();
  const mod = getModuleById(moduleId);

  if (!mod) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <p className="text-lg font-semibold">Módulo no encontrado</p>
        <Link href="/" className="mt-2 inline-block text-brand underline">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const state = config.modules[mod.id];
  const isAdmin = currentUser?.role === "admin";

  if (ready && !state?.enabled) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <p className="text-lg font-semibold">{mod.name} está desactivado</p>
        <Link href="/admin" className="mt-2 inline-block text-brand underline">
          Activarlo en Configuración
        </Link>
      </div>
    );
  }

  if (ready && !isAdmin && state?.userVisible === false) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <p className="text-lg font-semibold">Sin acceso</p>
        <p className="mt-1 text-sm text-neutral-500">No tienes permiso para ver «{mod.name}».</p>
        <Link href="/" className="mt-2 inline-block text-brand underline">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const Page = mod.Page;
  return <Page />;
}

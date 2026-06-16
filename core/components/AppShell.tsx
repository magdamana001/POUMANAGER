"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConfig } from "@/core/config/ConfigProvider";
import { getAllModules } from "@/core/modules/registry";

/**
 * Shell responsive de la app: cabecera, navegación lateral y contenido.
 * La navegación se construye SOLA a partir de los módulos activos.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { config } = useConfig();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const modules = getAllModules().filter((m) => config.modules[m.id]?.enabled);

  const navItems = [
    { href: "/", icon: "🏠", name: "Inicio" },
    ...modules.map((m) => ({ href: `/m/${m.id}`, icon: m.icon, name: m.name })),
    { href: "/admin", icon: "⚙️", name: "Configuración" },
  ];

  return (
    <div className="flex min-h-screen bg-neutral-100 text-neutral-900">
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Barra lateral */}
      <aside
        className={`fixed z-30 flex h-full w-64 transform flex-col bg-white shadow-lg transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-4">
          {config.general.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.general.logoUrl} alt="logo" className="h-9 w-9 rounded object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded bg-brand text-white">
              {config.general.businessName.charAt(0) || "B"}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{config.general.businessName}</p>
            <p className="truncate text-xs text-neutral-500">{config.general.tagline}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-brand text-white" : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-200 px-4 py-3 text-xs text-neutral-400">
          Espou Manager · v0.1
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 hover:bg-neutral-100"
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <span className="font-semibold">{config.general.businessName}</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

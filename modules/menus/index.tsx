"use client";

import type { ModuleDefinition } from "@/core/modules/types";
import { MenuEditor } from "./MenuEditor";

function MenusPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Menú del día</h1>
        <p className="text-neutral-500">
          Escribe el día y los platos: se componen sobre la plantilla y descargas la imagen.
        </p>
      </header>
      <MenuEditor />
    </div>
  );
}

export const menusModule: ModuleDefinition = {
  id: "menus",
  name: "Menús del día",
  description: "Crea el menú diario sobre tu plantilla y descárgalo como imagen.",
  icon: "🍽️",
  order: 2,
  enabledByDefault: true,
  Page: MenusPage,
  settings: {
    fields: [
      {
        key: "templateSrc",
        label: "Ruta de la plantilla",
        type: "text",
        defaultValue: "/templates/menu-dia.png",
        description: "Imagen de fondo del menú (en /public o una URL del mismo origen).",
      },
      {
        key: "textColor",
        label: "Color del texto",
        type: "color",
        defaultValue: "#37352f",
      },
    ],
  },
};

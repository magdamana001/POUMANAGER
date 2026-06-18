"use client";

import type { ModuleDefinition } from "@/core/modules/types";
import { MenuEditor } from "./MenuEditor";
import { MenuTemplatesSettings } from "./SettingsPanel";

function MenusPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Menú del día</h1>
        <p className="text-neutral-500">
          Elige una plantilla, escribe el día y los platos, y descarga la imagen.
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
  SettingsPanel: MenuTemplatesSettings,
  settings: {
    fields: [
      {
        key: "textColor",
        label: "Color del texto",
        type: "color",
        defaultValue: "#37352f",
      },
    ],
  },
};

"use client";

import type { ModuleDefinition } from "@/core/modules/types";
import { SuggestionsEditor } from "./SuggestionsEditor";
import { SuggestionsTemplatesSettings } from "./SettingsPanel";
import { SuggestionDishesProvider } from "./store";

function SuggestionsPage() {
  return (
    <SuggestionDishesProvider>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Sugerencias del fin de semana</h1>
          <p className="text-neutral-500">
            Elige la plantilla, escribe los platos con su precio y descarga la imagen.
          </p>
        </header>
        <SuggestionsEditor />
      </div>
    </SuggestionDishesProvider>
  );
}

export const sugerenciasModule: ModuleDefinition = {
  id: "sugerencias",
  name: "Sugerencias",
  description: "Crea la hoja de sugerencias del fin de semana con platos y precios.",
  icon: "🍤",
  order: 5,
  enabledByDefault: true,
  Page: SuggestionsPage,
  SettingsPanel: SuggestionsTemplatesSettings,
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

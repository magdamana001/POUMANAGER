import type { ModuleDefinition } from "@/core/modules/types";
import { timeTrackingModule } from "./time-tracking";
import { scheduleModule } from "./schedule";
import { menusModule } from "./menus";
import { ordersModule } from "./orders";
import { scannerModule } from "./scanner";
import { invoiceScannerModule } from "./invoice-scanner";

/**
 * ÚNICA lista a editar para enchufar un módulo nuevo.
 *
 * Para añadir una función:
 *   1. Crea una carpeta en /modules/<tu-modulo>/index.tsx
 *   2. Exporta un objeto `ModuleDefinition`
 *   3. Impórtalo y añádelo a este array
 *
 * El core (navegación, rutas, panel de admin) se actualiza solo.
 */
export const modules: ModuleDefinition[] = [
  timeTrackingModule,
  scheduleModule,
  menusModule,
  ordersModule,
  scannerModule,
  invoiceScannerModule,
];

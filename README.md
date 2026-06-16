# Espou Manager

Gestor web completo para tu bar, responsive (móvil / tablet / PC). Base de código
limpia con un sistema de **módulos enchufables**: las funciones se integran sin
ensuciar el núcleo.

## Arrancar

```bash
npm install
npm run dev      # desarrollo en http://localhost:3000
npm run build    # build de producción
npm start        # servir el build
```

## Arquitectura

```
core/        ← código base LIMPIO (casi nunca se toca)
  modules/   ← contrato (types.ts) y registro (registry.ts) de módulos
  config/    ← motor de configuración + persistencia (localStorage)
  components/← shell responsive, sidebar y campos de ajustes auto-generados
modules/     ← cada función es una carpeta enchufable
  index.ts   ← ÚNICA lista a editar para registrar módulos
app/         ← rutas Next.js que leen el registro (no conocen módulos concretos)
```

El **core** solo conoce la interfaz `ModuleDefinition`. La navegación, las rutas
(`/m/<id>`) y el panel de admin (`/admin`) se construyen automáticamente a partir
de los módulos activos. Los ajustes de cada módulo aparecen solos en el panel.

## Añadir un módulo nuevo (sin tocar el core)

1. Crea `modules/mi-modulo/index.tsx` y exporta un `ModuleDefinition`:

   ```tsx
   "use client";
   import type { ModuleDefinition } from "@/core/modules/types";

   function MiPage() {
     return <div>Hola módulo</div>;
   }

   export const miModulo: ModuleDefinition = {
     id: "mi-modulo",
     name: "Mi módulo",
     icon: "✨",
     order: 4,
     Page: MiPage,
     settings: {
       fields: [
         { key: "activo", label: "Activo", type: "boolean", defaultValue: true },
       ],
     },
   };
   ```

2. Añádelo al array en `modules/index.ts`. **Eso es todo.**

## Módulos incluidos

- **Control horario** (`time-tracking`) — fichajes de entrada/salida.
- **Menús del día** (`menus`) — creador de menú con vista previa (plantilla de
  imagen pendiente de integrar).
- **Pedidos** (`orders`) — gestión de pedidos, envío por WhatsApp e impresión.

## Pendiente / próximos pasos

- Persistencia en backend (hoy la config vive en `localStorage`).
- Generación real de imagen del menú desde plantilla (canvas / API).
- Autenticación y roles (admin / empleado) antes de desplegar en producción.
- Composición de imagen del pedido para enviar por WhatsApp.

## Notas de seguridad

- Aún **no hay autenticación**: cualquiera con la URL puede ver y configurar.
  Añade login antes de exponerlo en internet.
- Queda una alerta `npm audit` moderada en el `postcss` que Next 16 empaqueta
  internamente; no es corregible sin degradar Next y solo afecta a build-tools.
```

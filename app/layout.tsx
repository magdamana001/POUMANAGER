import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConfigProvider } from "@/core/config/ConfigProvider";
import { NotificationsProvider } from "@/core/notifications/store";
import { NotificationPrompt } from "@/core/notifications/NotificationPrompt";
import { AppShell } from "@/core/components/AppShell";

export const metadata: Metadata = {
  title: "Espou Manager",
  description: "Gestor completo para tu bar: horarios, menús, pedidos y más.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ConfigProvider>
          <NotificationsProvider>
            <NotificationPrompt />
            <AppShell>{children}</AppShell>
          </NotificationsProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}

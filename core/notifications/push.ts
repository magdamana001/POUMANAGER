/** Helpers de cliente para Web Push (service worker + suscripción). */

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

/** Registra el SW, se suscribe a push y envía la suscripción al servidor. */
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) throw new Error("Este navegador no soporta notificaciones push.");
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw new Error("Falta la clave VAPID pública. Configúrala y reinicia el servidor.");

  let appKey: Uint8Array;
  try {
    appKey = urlBase64ToUint8Array(key);
  } catch {
    throw new Error("La clave VAPID pública no tiene un formato válido.");
  }
  if (appKey.length !== 65) {
    throw new Error(
      `Clave VAPID inválida (longitud ${appKey.length}, debería ser 65). Reinicia el servidor tras configurarla.`
    );
  }

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  // Elimina cualquier suscripción previa (puede tener otra clave VAPID).
  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();
  } catch {
    /* ignore */
  }

  let sub: PushSubscription;
  try {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    throw new Error(
      `El navegador no pudo suscribir (${msg}). Requiere HTTPS o localhost; en Brave activa "servicios de Google para mensajería push"; prueba en Chrome/Edge.`
    );
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  return res.ok;
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
  }
}

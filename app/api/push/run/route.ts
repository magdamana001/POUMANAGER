import { NextResponse } from "next/server";
import webpush from "web-push";
import { kvGet, kvSet } from "@/core/server/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUBS_KEY = "espou-push-subs";
const SENT_KEY = "espou-push-sent";
const NOTIF_KEY = "espou-notifications";
const CONFIG_KEY = "espou-manager-config";
const WINDOW_MIN = 5;

interface Reminder {
  id: string;
  label: string;
  time: string;
  days: number[];
  enabled: boolean;
}
interface Sub {
  endpoint: string;
  keys?: { p256dh: string; auth: string };
}

/** Hora local (zona configurada): índice de día (0=Lun), minutos y clave de fecha. */
function localNow(tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(map.weekday);
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  return {
    idx: (wd + 6) % 7,
    minutes: hour * 60 + parseInt(map.minute, 10),
    dateKey: `${map.year}-${map.month}-${map.day}`,
  };
}

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // sin secreto configurado, no se exige
  const auth = req.headers.get("authorization");
  const url = new URL(req.url);
  return auth === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

async function handle(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return NextResponse.json({ error: "Faltan claves VAPID" }, { status: 500 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@espou.local", pub, priv);

  const notif = await kvGet<{ enabled: boolean; reminders: Reminder[] }>(NOTIF_KEY);
  if (!notif?.enabled) return NextResponse.json({ ok: true, skipped: "deshabilitado" });

  const config = await kvGet<{ general?: { timezone?: string } }>(CONFIG_KEY);
  const tz = config?.general?.timezone || "Europe/Madrid";
  const { idx, minutes, dateKey } = localNow(tz);

  const due = (notif.reminders ?? []).filter((r) => {
    if (!r.enabled || !r.days.includes(idx)) return false;
    const [h, m] = r.time.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return false;
    const remMin = h * 60 + m;
    return minutes >= remMin && minutes - remMin <= WINDOW_MIN;
  });

  const sent = (await kvGet<Record<string, boolean>>(SENT_KEY)) ?? {};
  const pending = due.filter((r) => !sent[`${r.id}_${dateKey}`]);

  if (pending.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const subs = (await kvGet<Sub[]>(SUBS_KEY)) ?? [];
  const dead = new Set<string>();
  let count = 0;

  for (const r of pending) {
    const payload = JSON.stringify({ title: "Espou Manager", body: r.label, tag: r.id });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(s as webpush.PushSubscription, payload);
          count++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) dead.add(s.endpoint);
        }
      })
    );
    sent[`${r.id}_${dateKey}`] = true;
  }

  // Limpia disparos de otros días y suscripciones caducadas.
  for (const k of Object.keys(sent)) if (!k.endsWith(dateKey)) delete sent[k];
  await kvSet(SENT_KEY, sent);
  if (dead.size) await kvSet(SUBS_KEY, subs.filter((s) => !dead.has(s.endpoint)));

  return NextResponse.json({ ok: true, reminders: pending.length, pushes: count, removed: dead.size });
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}

import { NextResponse } from "next/server";
import { kvGet, kvSet } from "@/core/server/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUBS_KEY = "espou-push-subs";

interface Sub {
  endpoint: string;
  keys?: { p256dh: string; auth: string };
}

/** Registra una suscripción push del navegador. */
export async function POST(req: Request) {
  try {
    const sub = (await req.json()) as Sub;
    if (!sub?.endpoint) return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
    const subs = (await kvGet<Sub[]>(SUBS_KEY)) ?? [];
    if (!subs.some((s) => s.endpoint === sub.endpoint)) {
      subs.push(sub);
      await kvSet(SUBS_KEY, subs);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

/** Elimina una suscripción (por endpoint). */
export async function DELETE(req: Request) {
  try {
    const { endpoint } = (await req.json()) as { endpoint?: string };
    if (!endpoint) return NextResponse.json({ error: "Falta endpoint" }, { status: 400 });
    const subs = (await kvGet<Sub[]>(SUBS_KEY)) ?? [];
    await kvSet(SUBS_KEY, subs.filter((s) => s.endpoint !== endpoint));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

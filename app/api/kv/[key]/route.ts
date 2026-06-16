import { NextResponse } from "next/server";
import { storeDelete, storeGet, storeSet } from "@/core/server/fileStore";

// Necesita ejecutarse en el servidor en cada petición (lee/escribe disco).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ key: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { key } = await params;
  const value = await storeGet(key);
  return NextResponse.json({ value: value ?? null });
}

export async function PUT(req: Request, { params }: Params) {
  const { key } = await params;
  try {
    const value = await req.json();
    await storeSet(key, value);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { key } = await params;
  await storeDelete(key);
  return NextResponse.json({ ok: true });
}

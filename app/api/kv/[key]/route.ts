import { NextResponse } from "next/server";
import { storeDelete, storeGet, storeSet } from "@/core/server/fileStore";

// Necesita ejecutarse en el servidor en cada petición (lee/escribe disco).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ key: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { key } = await params;
  const entry = await storeGet(key);
  return NextResponse.json(entry ?? { value: null, updatedAt: 0 });
}

export async function PUT(req: Request, { params }: Params) {
  const { key } = await params;
  try {
    const value = await req.json();
    const updatedAt = await storeSet(key, value);
    return NextResponse.json({ ok: true, updatedAt });
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { key } = await params;
  await storeDelete(key);
  return NextResponse.json({ ok: true });
}

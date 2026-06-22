import { NextResponse } from "next/server";
import { getSecretsStatus, isAdminAccount, saveAiSecrets } from "@/core/server/secrets";
import { isUsingDefaultKey } from "@/core/server/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Estado enmascarado de las claves/modelos (no devuelve secretos en claro). */
export async function GET() {
  const status = await getSecretsStatus();
  return NextResponse.json({ ...status, insecureKey: isUsingDefaultKey() });
}

/** Guarda claves (cifradas) y modelos. Requiere cuenta de administrador. */
export async function POST(req: Request) {
  let body: {
    accountId?: string;
    geminiApiKey?: string | null;
    nvidiaApiKey?: string | null;
    geminiModel?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  if (!(await isAdminAccount(body.accountId))) {
    return NextResponse.json({ error: "Solo un administrador puede cambiar la configuración." }, { status: 403 });
  }

  await saveAiSecrets({
    geminiApiKey: body.geminiApiKey,
    nvidiaApiKey: body.nvidiaApiKey,
    geminiModel: body.geminiModel,
  });

  const status = await getSecretsStatus();
  return NextResponse.json({ ok: true, ...status, insecureKey: isUsingDefaultKey() });
}

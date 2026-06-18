import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = path.join(process.cwd(), "public", "templates");
const IMG_RE = /\.(png|jpe?g|webp)$/i;
const SAFE_FILE = /^[a-z0-9._-]+\.(png|jpe?g|webp)$/i;

interface TemplateInfo {
  name: string;
  file: string;
  src: string;
}

async function listFiles(): Promise<TemplateInfo[]> {
  try {
    const files = await fs.readdir(DIR);
    return files
      .filter((f) => IMG_RE.test(f))
      .sort()
      .map((f) => ({ name: f.replace(IMG_RE, ""), file: f, src: `/api/templates/img/${f}` }));
  } catch {
    return [];
  }
}

export async function GET() {
  return NextResponse.json({ templates: await listFiles() });
}

/** Siguiente índice: menu-dia.png => 0, menu-dia3.png => 3 … */
function nextName(files: string[]): string {
  let max = 0;
  for (const f of files) {
    const m = /^menu-dia(\d*)\.(png|jpe?g|webp)$/i.exec(f);
    if (m) max = Math.max(max, m[1] ? parseInt(m[1], 10) : 0);
  }
  return `menu-dia${max + 1}.png`;
}

export async function POST(req: Request) {
  try {
    const { dataUrl } = (await req.json()) as { dataUrl?: string };
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Imagen inválida." }, { status: 400 });
    }
    const base64 = dataUrl.split(",")[1] ?? "";
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length < 100) {
      return NextResponse.json({ error: "Imagen vacía." }, { status: 400 });
    }

    await fs.mkdir(DIR, { recursive: true });
    const existing = (await fs.readdir(DIR).catch(() => [])) as string[];
    const file = nextName(existing.filter((f) => IMG_RE.test(f)));
    await fs.writeFile(path.join(DIR, file), buffer);

    return NextResponse.json({ name: file.replace(IMG_RE, ""), file, src: `/api/templates/img/${file}` });
  } catch (e) {
    // En hostings de solo lectura (p. ej. Vercel) la escritura falla aquí.
    return NextResponse.json(
      { error: `No se pudo guardar el archivo. ${e instanceof Error ? e.message : ""}`.slice(0, 200) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file") ?? "";
  if (!SAFE_FILE.test(file)) {
    return NextResponse.json({ error: "Nombre de archivo no válido." }, { status: 400 });
  }
  try {
    await fs.unlink(path.join(DIR, file));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar." }, { status: 500 });
  }
}

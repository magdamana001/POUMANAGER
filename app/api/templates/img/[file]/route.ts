import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = path.join(process.cwd(), "public", "templates");
const SAFE_FILE = /^[a-z0-9._-]+\.(png|jpe?g|webp)$/i;

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/**
 * Sirve una plantilla leyéndola del disco en cada petición. Evita el problema
 * de Next dev, que no sirve los archivos nuevos de /public hasta reiniciar.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!SAFE_FILE.test(file)) {
    return new Response("Nombre no válido", { status: 400 });
  }
  try {
    const buffer = await fs.readFile(path.join(DIR, file));
    const ext = path.extname(file).toLowerCase();
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("No encontrada", { status: 404 });
  }
}

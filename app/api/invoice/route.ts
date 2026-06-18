import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UNITS = ["ud", "caja", "kg", "L", "botella", "barril", "paquete"];

/**
 * Extrae las líneas de un albarán/factura usando Gemini Vision (plan gratuito).
 * Body: { imageBase64: string (sin prefijo), mimeType: string }
 * Respuesta: { lines: [{name, qty, unit, price}], supplier?, date? }
 */
export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta GEMINI_API_KEY en el servidor." }, { status: 500 });
  }

  let imageBase64: string;
  let mimeType: string;
  try {
    const body = await req.json();
    imageBase64 = body.imageBase64;
    mimeType = body.mimeType || "image/jpeg";
    if (!imageBase64) throw new Error("sin imagen");
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const prompt = `Eres un asistente que lee albaranes y facturas de proveedores de un bar/restaurante.
Extrae SOLO las líneas de producto (ignora cabeceras, impuestos, totales, portes).
Devuelve un objeto JSON con esta forma exacta:
{
  "supplier": "nombre del proveedor si aparece, si no \"\"",
  "date": "fecha del documento en formato YYYY-MM-DD si aparece, si no \"\"",
  "lines": [
    { "name": "nombre del producto", "qty": número de unidades recibidas, "unit": una de [${UNITS.join(", ")}], "price": precio UNITARIO sin IVA (número, punto decimal) }
  ]
}
Reglas:
- "qty" es la cantidad recibida (columna de unidades/cantidad).
- "price" es el precio por unidad; si solo hay precio total de la línea, divídelo entre la cantidad.
- Si no reconoces la unidad usa "ud".
- Usa punto decimal, sin símbolos de moneda.`;

  const requestBody = JSON.stringify({
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
  });

  const candidates = Array.from(
    new Set([process.env.GEMINI_MODEL || "gemini-2.0-flash", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"])
  );

  try {
    let res: Response | null = null;
    let detail = "";
    for (const model of candidates) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: requestBody }
      );
      if (res.ok) break;
      detail = await res.text();
      if (res.status !== 404) break;
    }
    if (!res || !res.ok) {
      const status = res?.status ?? 500;
      return NextResponse.json({ error: `Gemini rechazó la petición (${status}). ${detail.slice(0, 200)}` }, { status: 502 });
    }

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = safeParse(text);

    const lines = Array.isArray(parsed.lines)
      ? parsed.lines
          .map((l) => ({
            name: String(l?.name ?? "").trim().slice(0, 80),
            qty: clampNum(l?.qty, 0),
            unit: UNITS.includes(String(l?.unit)) ? String(l.unit) : "ud",
            price: clampNum(l?.price, 0),
          }))
          .filter((l) => l.name)
      : [];

    return NextResponse.json({
      supplier: String(parsed.supplier ?? "").slice(0, 80),
      date: String(parsed.date ?? "").slice(0, 10),
      lines,
    });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar con Gemini." }, { status: 502 });
  }
}

function clampNum(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : fallback;
}

function safeParse(text: string): { supplier?: string; date?: string; lines?: Array<{ name?: unknown; qty?: unknown; unit?: unknown; price?: unknown }> } {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* ignore */
      }
    }
    return {};
  }
}

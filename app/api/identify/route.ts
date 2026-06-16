import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNITS = ["ud", "caja", "kg", "L", "botella", "barril", "paquete"];

/**
 * Identifica un producto a partir de una imagen usando la API gratuita de
 * Gemini (Google AI Studio). La clave vive solo en el servidor.
 *
 * Body: { imageBase64: string (sin prefijo data:), mimeType: string }
 * Respuesta: { name, unit, emoji, raw? }
 */
export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta GEMINI_API_KEY en el servidor." },
      { status: 500 }
    );
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

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const prompt = `Eres un asistente de un bar/restaurante. Mira la imagen e identifica el PRODUCTO principal (bebida, comida o suministro).
Responde con un objeto JSON con estas claves exactas:
- "name": nombre corto y comercial del producto en español (máx 40 caracteres).
- "unit": una de estas unidades de pedido: ${UNITS.join(", ")}.
- "emoji": un único emoji representativo del producto.
Si no reconoces el producto, usa name "Producto sin identificar", unit "ud", emoji "📦".`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: "Gemini rechazó la petición.", detail: detail.slice(0, 300) },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const parsed = safeParse(text);
    const unit = parsed.unit && UNITS.includes(parsed.unit) ? parsed.unit : "ud";
    return NextResponse.json({
      name: String(parsed.name || "Producto sin identificar").slice(0, 60),
      unit,
      emoji: String(parsed.emoji || "📦").slice(0, 4),
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo contactar con Gemini." },
      { status: 502 }
    );
  }
}

function safeParse(text: string): { name?: string; unit?: string; emoji?: string } {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* ignorar */
      }
    }
    return {};
  }
}

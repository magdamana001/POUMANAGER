import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // la generación puede tardar varios segundos

/**
 * Genera una miniatura de producto profesional usando proveedores gratuitos:
 *  1. (Opcional) Gemini Vision describe el producto de la foto (plan gratuito).
 *  2. Generación de imagen, por orden de preferencia:
 *     a) NVIDIA NIM (Stable Diffusion XL) si hay NVIDIA_API_KEY (créditos gratis).
 *     b) Pollinations (Flux), gratis y sin clave, como alternativa.
 *
 * Body: { imageBase64?: string (sin prefijo), mimeType?: string, name?: string }
 * Respuesta: { image: dataURL }
 */
export async function POST(req: Request) {
  let imageBase64: string | undefined;
  let mimeType = "image/jpeg";
  let name = "";
  let mode: "product" | "logo" = "product";
  let context = "";
  try {
    const body = await req.json();
    imageBase64 = body.imageBase64;
    if (body.mimeType) mimeType = body.mimeType;
    name = (body.name || "").toString();
    if (body.mode === "logo") mode = "logo";
    context = (body.context || "").toString();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  // 1) Describir el producto (solo para miniaturas con foto).
  let subject = name;
  if (mode === "product" && imageBase64) {
    const described = await describeProduct(imageBase64, mimeType);
    if (described) subject = described;
  }
  if (!subject) {
    return NextResponse.json({ error: "Falta el nombre del producto o una imagen." }, { status: 400 });
  }

  let positive: string;
  let negative: string;
  if (mode === "logo") {
    positive = `flat minimalist vector logo emblem for a business named "${name}"${
      context ? `, a supplier of ${context}` : ""
    }. Simple iconic symbol, bold clean shapes, balanced composition, solid white background, centered, professional modern brand identity, sticker style.`;
    negative = "photo, realistic, photograph, 3d render, paragraphs of text, watermark, busy background, clutter, low quality";
  } else {
    positive = `professional product photo of ${subject}, single product centered, plain solid white background, soft studio lighting, clean e-commerce catalog style, high detail, square`;
    negative = "text, watermark, logo, hands, people, cluttered background, multiple products, blurry, low quality";
  }

  const errors: string[] = [];

  // 2a) NVIDIA SDXL (preferente si hay clave).
  if (process.env.NVIDIA_API_KEY) {
    try {
      const image = await nvidiaSDXL(positive, negative, process.env.NVIDIA_API_KEY);
      return NextResponse.json({ image });
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "NVIDIA error");
    }
  }

  // 2b) Pollinations (gratis, sin clave).
  try {
    const image = await pollinations(positive);
    return NextResponse.json({ image });
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "Pollinations error");
  }

  return NextResponse.json(
    { error: `No se pudo generar la imagen. ${errors.join(" | ").slice(0, 250)}` },
    { status: 502 }
  );
}

/** NVIDIA NIM — Stable Diffusion XL (síncrono, devuelve JPEG en base64). */
async function nvidiaSDXL(
  positive: string,
  negative: string,
  apiKey: string
): Promise<string> {
  const res = await fetch(
    "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text_prompts: [
          { text: positive, weight: 1 },
          { text: negative, weight: -1 },
        ],
        cfg_scale: 5,
        sampler: "K_DPM_2_ANCESTRAL",
        seed: Math.floor(Math.random() * 4_294_967_295),
        steps: 25,
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`NVIDIA (${res.status}) ${(await res.text()).slice(0, 160)}`);
  }
  const data = await res.json();
  const b64 = data?.artifacts?.[0]?.base64;
  if (!b64) throw new Error("NVIDIA no devolvió imagen");
  return `data:image/jpeg;base64,${b64}`;
}

/** Pollinations (Flux) — gratis y sin clave. */
async function pollinations(prompt: string): Promise<string> {
  const seed = Math.floor(Math.random() * 1_000_000);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt
  )}?width=768&height=768&nologo=true&model=flux&seed=${seed}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pollinations (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 200) throw new Error("Pollinations imagen vacía");
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

/**
 * Pide a Gemini (plan gratuito, solo texto/visión) una descripción visual
 * corta del producto en inglés. Devuelve "" si no está disponible.
 */
async function describeProduct(
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const prompt =
    "Describe the main product in this image in ONE short English phrase suitable for an image generator (type, brand if visible, color, format/packaging). Reply with the phrase only, no quotes.";
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
          generationConfig: { temperature: 0.2 },
        }),
      }
    );
    if (!res.ok) return "";
    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return text.trim().replace(/^["']|["']$/g, "").slice(0, 200);
  } catch {
    return "";
  }
}

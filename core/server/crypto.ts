import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * Cifrado simétrico (AES-256-GCM) para guardar secretos (API keys) cifrados
 * en la base de datos. La clave se deriva de un secreto del servidor.
 *
 * Configura `SECRETS_KEY` (o se reutiliza `CRON_SECRET`) en las variables de
 * entorno. Sin ninguno de los dos, se usa una clave por defecto INSEGURA
 * (solo para desarrollo) y se avisa en el panel.
 */
const SECRET = process.env.SECRETS_KEY || process.env.CRON_SECRET || "espou-insecure-default-key";
const KEY = scryptSync(SECRET, "espou-secrets-salt-v1", 32);

/** Cifra un texto. Devuelve "iv:tag:data" en base64. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

/** Descifra un "iv:tag:data". Devuelve "" si no es válido. */
export function decryptSecret(payload: string): string {
  try {
    const [ivB, tagB, dataB] = payload.split(":");
    if (!ivB || !tagB || !dataB) return "";
    const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivB, "base64"));
    decipher.setAuthTag(Buffer.from(tagB, "base64"));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB, "base64")), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return "";
  }
}

/** true si no hay secreto de cifrado configurado (clave por defecto insegura). */
export function isUsingDefaultKey(): boolean {
  return !process.env.SECRETS_KEY && !process.env.CRON_SECRET;
}

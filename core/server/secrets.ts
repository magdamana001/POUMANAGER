import { kvGet, kvSet } from "./kv";
import { decryptSecret, encryptSecret } from "./crypto";

const SECRETS_KEY = "espou-secrets";
const AUTH_KEY = "espou-auth";

interface AiSecrets {
  geminiApiKey?: string; // cifrado
  geminiModel?: string; // texto plano (no sensible)
  nvidiaApiKey?: string; // cifrado
}
interface StoredSecrets {
  ai?: AiSecrets;
}

export interface AiConfig {
  geminiApiKey: string;
  geminiModel: string;
  nvidiaApiKey: string;
}

async function load(): Promise<StoredSecrets> {
  return (await kvGet<StoredSecrets>(SECRETS_KEY)) ?? {};
}

/** Config resuelta para el servidor: BD (descifrada) con respaldo a env. */
export async function getAiConfig(): Promise<AiConfig> {
  const s = (await load()).ai ?? {};
  const gemini = s.geminiApiKey ? decryptSecret(s.geminiApiKey) : "";
  const nvidia = s.nvidiaApiKey ? decryptSecret(s.nvidiaApiKey) : "";
  return {
    geminiApiKey: gemini || process.env.GEMINI_API_KEY || "",
    geminiModel: s.geminiModel || process.env.GEMINI_MODEL || "gemini-2.0-flash",
    nvidiaApiKey: nvidia || process.env.NVIDIA_API_KEY || "",
  };
}

type Source = "db" | "env" | "none";
export interface KeyStatus {
  set: boolean;
  source: Source;
  last4: string;
}
export interface SecretsStatus {
  geminiApiKey: KeyStatus;
  nvidiaApiKey: KeyStatus;
  geminiModel: string;
}

function statusOf(db: string, env: string | undefined): KeyStatus {
  const val = db || env || "";
  return { set: !!val, source: db ? "db" : env ? "env" : "none", last4: val ? val.slice(-4) : "" };
}

/** Estado enmascarado para la UI (nunca devuelve las claves en claro). */
export async function getSecretsStatus(): Promise<SecretsStatus> {
  const s = (await load()).ai ?? {};
  const gemDb = s.geminiApiKey ? decryptSecret(s.geminiApiKey) : "";
  const nvDb = s.nvidiaApiKey ? decryptSecret(s.nvidiaApiKey) : "";
  return {
    geminiApiKey: statusOf(gemDb, process.env.GEMINI_API_KEY),
    nvidiaApiKey: statusOf(nvDb, process.env.NVIDIA_API_KEY),
    geminiModel: s.geminiModel || process.env.GEMINI_MODEL || "gemini-2.0-flash",
  };
}

export interface SaveAiInput {
  /** string => fija; "" o null => borra; undefined => no cambia. */
  geminiApiKey?: string | null;
  nvidiaApiKey?: string | null;
  geminiModel?: string | null;
}

export async function saveAiSecrets(input: SaveAiInput): Promise<void> {
  const current = await load();
  const ai: AiSecrets = { ...(current.ai ?? {}) };

  const apply = (field: "geminiApiKey" | "nvidiaApiKey", val: string | null | undefined) => {
    if (val === undefined) return;
    if (val === null || val.trim() === "") {
      delete ai[field];
      return;
    }
    ai[field] = encryptSecret(val.trim());
  };
  apply("geminiApiKey", input.geminiApiKey);
  apply("nvidiaApiKey", input.nvidiaApiKey);

  if (input.geminiModel !== undefined) {
    const m = (input.geminiModel ?? "").trim();
    if (m) ai.geminiModel = m;
    else delete ai.geminiModel;
  }

  await kvSet(SECRETS_KEY, { ...current, ai });
}

/** Defensa básica: comprueba que la cuenta exista y sea admin (auth a nivel de app). */
export async function isAdminAccount(accountId: string | undefined): Promise<boolean> {
  if (!accountId) return false;
  const auth = await kvGet<{ accounts?: { id: string; role: string }[] }>(AUTH_KEY);
  return auth?.accounts?.find((a) => a.id === accountId)?.role === "admin";
}

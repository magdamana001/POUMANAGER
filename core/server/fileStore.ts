import { promises as fs } from "fs";
import path from "path";

/**
 * Base de datos del servidor: archivo JSON clave-valor en /data/db.json.
 * Persistente en el disco del host y compartida por todos los dispositivos.
 *
 * Cada entrada se guarda como { __value, __ts } donde __ts es la versión
 * (marca de tiempo). Permite que los clientes detecten cambios y apliquen
 * siempre la versión más reciente, evitando perder datos.
 *
 * - Escritura atómica (archivo temporal + rename).
 * - Operaciones serializadas en una cola para evitar carreras.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

interface Entry {
  __value: unknown;
  __ts: number;
}
type DB = Record<string, unknown>;

export interface ReadResult {
  value: unknown;
  updatedAt: number;
}

// Versión monótona creciente, incluso con varias escrituras en el mismo ms.
let lastTs = 0;
function nextTs(): number {
  lastTs = Math.max(Date.now(), lastTs + 1);
  return lastTs;
}

// Cola para serializar lecturas/escrituras dentro del proceso.
let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function readAll(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    return JSON.parse(raw) as DB;
  } catch {
    return {};
  }
}

async function writeAll(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE);
}

function isEntry(x: unknown): x is Entry {
  return typeof x === "object" && x !== null && "__ts" in x && "__value" in x;
}

export function storeGet(key: string): Promise<ReadResult | undefined> {
  return withLock(async () => {
    const raw = (await readAll())[key];
    if (raw === undefined) return undefined;
    // Entradas con versión vs. datos heredados (sin versión).
    if (isEntry(raw)) return { value: raw.__value, updatedAt: raw.__ts };
    return { value: raw, updatedAt: 0 };
  });
}

export function storeSet(key: string, value: unknown): Promise<number> {
  return withLock(async () => {
    const db = await readAll();
    const ts = nextTs();
    db[key] = { __value: value, __ts: ts } satisfies Entry;
    await writeAll(db);
    return ts;
  });
}

export function storeDelete(key: string): Promise<void> {
  return withLock(async () => {
    const db = await readAll();
    delete db[key];
    await writeAll(db);
  });
}

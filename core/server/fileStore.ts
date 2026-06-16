import { promises as fs } from "fs";
import path from "path";

/**
 * Base de datos del servidor: un archivo JSON clave-valor en /data/db.json.
 * Persistente en el disco del host. Compartida por todos los dispositivos
 * que se conecten a este servidor.
 *
 * - Escritura atómica (archivo temporal + rename) para no corromper datos.
 * - Las operaciones se serializan en una cola para evitar carreras cuando
 *   varios dispositivos escriben a la vez.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

type DB = Record<string, unknown>;

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

export function storeGet(key: string): Promise<unknown> {
  return withLock(async () => (await readAll())[key]);
}

export function storeSet(key: string, value: unknown): Promise<void> {
  return withLock(async () => {
    const db = await readAll();
    db[key] = value;
    await writeAll(db);
  });
}

export function storeDelete(key: string): Promise<void> {
  return withLock(async () => {
    const db = await readAll();
    delete db[key];
    await writeAll(db);
  });
}

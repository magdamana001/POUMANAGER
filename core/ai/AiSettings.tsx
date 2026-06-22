"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/core/auth/store";

interface KeyStatus {
  set: boolean;
  source: "db" | "env" | "none";
  last4: string;
}
interface Status {
  geminiApiKey: KeyStatus;
  nvidiaApiKey: KeyStatus;
  geminiModel: string;
  insecureKey?: boolean;
}

const SOURCE_LABEL: Record<string, string> = {
  db: "guardada y cifrada",
  env: "desde variable de entorno",
  none: "sin configurar",
};

export function AiSettings() {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<Status | null>(null);
  const [geminiKey, setGeminiKey] = useState("");
  const [nvidiaKey, setNvidiaKey] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = async () => {
    try {
      const res = await fetch("/api/admin/secrets", { cache: "no-store" });
      const data = (await res.json()) as Status;
      setStatus(data);
      setModel(data.geminiModel || "");
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const post = async (payload: Record<string, unknown>, okText: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: currentUser?.id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || "No se pudo guardar." });
      } else {
        setStatus(data);
        setModel(data.geminiModel || "");
        setGeminiKey("");
        setNvidiaKey("");
        setMsg({ ok: true, text: okText });
      }
    } catch {
      setMsg({ ok: false, text: "Error de red." });
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    post(
      {
        geminiApiKey: geminiKey.trim() ? geminiKey.trim() : undefined,
        nvidiaApiKey: nvidiaKey.trim() ? nvidiaKey.trim() : undefined,
        geminiModel: model,
      },
      "Configuración guardada y cifrada."
    );

  const clearKey = (field: "geminiApiKey" | "nvidiaApiKey") =>
    confirm("¿Quitar esta clave guardada?") && post({ [field]: null }, "Clave eliminada.");

  const input = "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";

  const StatusBadge = ({ s }: { s?: KeyStatus }) => {
    if (!s) return null;
    const tone = s.source === "db" ? "bg-green-100 text-green-700" : s.source === "env" ? "bg-blue-100 text-blue-700" : "bg-neutral-100 text-neutral-500";
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
        {s.set ? `••••${s.last4} · ${SOURCE_LABEL[s.source]}` : "sin configurar"}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
        🔒 Las claves se guardan <strong>cifradas</strong> (AES-256-GCM) en la base de datos. Aquí solo verás los últimos 4 dígitos. Deja un campo vacío para mantener la clave actual.
      </p>

      {status?.insecureKey && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          ⚠️ No hay clave de cifrado del servidor. Configura <code className="rounded bg-amber-100 px-1">SECRETS_KEY</code> (o <code className="rounded bg-amber-100 px-1">CRON_SECRET</code>) en las variables de entorno para un cifrado seguro. Mientras tanto se usa una clave por defecto.
        </p>
      )}

      {/* Gemini */}
      <div className="rounded-xl border border-neutral-200 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Google Gemini</p>
          <StatusBadge s={status?.geminiApiKey} />
        </div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">API key</label>
        <div className="flex gap-2">
          <input className={input} type="password" placeholder="Nueva API key (dejar vacío = mantener)" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} autoComplete="off" />
          {status?.geminiApiKey.source === "db" && (
            <button onClick={() => clearKey("geminiApiKey")} className="shrink-0 rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50">Quitar</button>
          )}
        </div>
        <label className="mb-1 mt-3 block text-xs font-medium text-neutral-500">Modelo</label>
        <input className={input} value={model} onChange={(e) => setModel(e.target.value)} placeholder="gemini-2.0-flash" />
        <p className="mt-1 text-xs text-neutral-400">Ej.: gemini-2.0-flash, gemini-2.5-flash, gemini-1.5-flash. Si el modelo no existe, se prueban alternativas.</p>
      </div>

      {/* NVIDIA */}
      <div className="rounded-xl border border-neutral-200 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">NVIDIA (imágenes SDXL)</p>
          <StatusBadge s={status?.nvidiaApiKey} />
        </div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">API key</label>
        <div className="flex gap-2">
          <input className={input} type="password" placeholder="Nueva API key (dejar vacío = mantener)" value={nvidiaKey} onChange={(e) => setNvidiaKey(e.target.value)} autoComplete="off" />
          {status?.nvidiaApiKey.source === "db" && (
            <button onClick={() => clearKey("nvidiaApiKey")} className="shrink-0 rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50">Quitar</button>
          )}
        </div>
        <p className="mt-1 text-xs text-neutral-400">Opcional. Sin clave, las miniaturas usan Pollinations (gratis).</p>
      </div>

      {msg && (
        <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "border border-green-200 bg-green-50 text-green-700" : "border border-red-200 bg-red-50 text-red-700"}`}>
          {msg.text}
        </p>
      )}

      <button onClick={save} disabled={busy} className="rounded-xl bg-brand px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50">
        {busy ? "Guardando…" : "Guardar configuración"}
      </button>
    </div>
  );
}

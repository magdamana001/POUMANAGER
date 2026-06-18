"use client";

import { useMemo, useRef, useState } from "react";
import { useConfig } from "@/core/config/ConfigProvider";
import { useTimeTracking } from "../store";
import type { Employee } from "../types";
import { formatMoney, todayISO } from "../utils";
import { EmployeeAvatar } from "./EmployeeAvatar";
import { fileToDataUrl, makeSquareIcon } from "@/core/ai/image";

const COLORS = [
  "#e11d48", "#f97316", "#d97706", "#ca8a04", "#16a34a", "#0d9488",
  "#0891b2", "#2563eb", "#4f46e5", "#7c3aed", "#c026d3", "#475569",
];
const EMOJIS = ["🧑‍🍳", "👩‍🍳", "🍺", "🍷", "☕", "🧹", "💪", "⭐", "😎", "🧔", "👩", "🧑"];

interface EmpForm {
  name: string;
  position: string;
  phone: string;
  email: string;
  contractHours: number;
  extraHourPrice: number;
  startDate: string;
  active: boolean;
  notes: string;
  color: string;
  avatar?: string;
}

export function EmployeesTab() {
  const { employees, addEmployee, updateEmployee, removeEmployee } = useTimeTracking();
  const { config } = useConfig();
  const currency = config.general.currency;
  const defaultContract = (config.modules["time-tracking"]?.settings?.defaultContractHours as number) ?? 40;

  const blank = (): EmpForm => ({
    name: "",
    position: "",
    phone: "",
    email: "",
    contractHours: defaultContract,
    extraHourPrice: 0,
    startDate: todayISO(),
    active: true,
    notes: "",
    color: COLORS[0],
  });

  const [form, setForm] = useState<EmpForm>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<EmpForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    if (!form.name.trim()) return;
    if (editingId) updateEmployee(editingId, form);
    else addEmployee(form);
    setForm(blank());
    setEditingId(null);
  };

  const startEdit = (e: Employee) => {
    setEditingId(e.id);
    setForm({
      name: e.name,
      position: e.position,
      phone: e.phone ?? "",
      email: e.email ?? "",
      contractHours: e.contractHours,
      extraHourPrice: e.extraHourPrice,
      startDate: e.startDate || todayISO(),
      active: e.active ?? true,
      notes: e.notes ?? "",
      color: e.color,
      avatar: e.avatar,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      set({ avatar: await makeSquareIcon(dataUrl, 128) });
    } catch {
      /* ignore */
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const filtered = useMemo(
    () =>
      employees.filter(
        (e) => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.position.toLowerCase().includes(search.toLowerCase())
      ),
    [employees, search]
  );

  const input = "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:outline-none";

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Ficha */}
      <div className="lg:col-span-2">
        <div className={`rounded-2xl border bg-white p-5 shadow-sm ${editingId ? "border-brand/40" : "border-neutral-200"}`}>
          <h2 className="mb-4 font-semibold">{editingId ? "Editar empleado" : "Nuevo empleado"}</h2>

          {/* Avatar + identidad */}
          <div className="mb-4 flex items-start gap-4">
            <EmployeeAvatar name={form.name || "?"} color={form.color} avatar={form.avatar} size={72} />
            <div className="min-w-0 flex-1">
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
              <div className="mb-2 flex flex-wrap gap-1">
                {EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => set({ avatar: em })}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-base transition ${form.avatar === em ? "bg-brand-soft ring-1 ring-brand" : "hover:bg-neutral-100"}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100">📷 Foto</button>
                {form.avatar && <button type="button" onClick={() => set({ avatar: undefined })} className="rounded-lg px-2 py-1 text-xs text-neutral-400 hover:text-red-500">Quitar</button>}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Nombre</label>
              <input className={input} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Nombre y apellidos" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Puesto</label>
              <input className={input} value={form.position} onChange={(e) => set({ position: e.target.value })} placeholder="Camarero, cocina..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Teléfono</label>
                <input className={input} value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <input className={input} value={form.email} onChange={(e) => set({ email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Horas/contrato (sem.)</label>
                <input type="number" min={0} className={input} value={form.contractHours} onChange={(e) => set({ contractHours: Number(e.target.value) })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Precio hora extra</label>
                <input type="number" min={0} step="0.01" className={input} value={form.extraHourPrice} onChange={(e) => set({ extraHourPrice: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Fecha de alta</label>
                <input type="date" className={input} value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Estado</label>
                <button
                  type="button"
                  onClick={() => set({ active: !form.active })}
                  className={`flex h-[38px] w-full items-center justify-center rounded-lg text-sm font-medium ${form.active ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-600"}`}
                >
                  {form.active ? "Activo" : "Inactivo"}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Color</label>
              <div className="flex flex-wrap items-center gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => set({ color: c })} style={{ backgroundColor: c }} className={`h-7 w-7 rounded-full transition ${form.color === c ? "ring-2 ring-offset-2 ring-neutral-400" : ""}`} aria-label={`Color ${c}`} />
                ))}
                <label className="ml-1 flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2 py-1 text-xs text-neutral-500">
                  <input type="color" value={form.color} onChange={(e) => set({ color: e.target.value })} className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0" />
                  Personalizado
                </label>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Notas</label>
              <textarea className={input} rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={submit} className="flex-1 rounded-xl bg-brand py-2.5 font-medium text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]">
                {editingId ? "Guardar cambios" : "Añadir empleado"}
              </button>
              {editingId && (
                <button onClick={() => { setEditingId(null); setForm(blank()); }} className="rounded-xl border border-neutral-300 px-4 hover:bg-neutral-100">Cancelar</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Listado */}
      <div className="lg:col-span-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Empleados ({employees.length})</h2>
            <input className="w-44 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-brand focus:outline-none" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-neutral-400">Sin resultados.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((e) => (
                <li key={e.id} className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 ${e.active ? "border-neutral-100 bg-neutral-50" : "border-neutral-100 bg-neutral-100/60 opacity-70"}`}>
                  <EmployeeAvatar name={e.name} color={e.color} avatar={e.avatar} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-medium">
                      {e.name}
                      {!e.active && <span className="rounded bg-neutral-300 px-1.5 text-[10px] text-neutral-700">inactivo</span>}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {e.position || "—"} · {e.contractHours}h/sem · extra {formatMoney(e.extraHourPrice, currency)}
                      {e.phone ? ` · ${e.phone}` : ""}
                    </p>
                  </div>
                  <div className="flex w-full justify-end gap-1 sm:w-auto">
                    <button onClick={() => updateEmployee(e.id, { active: !e.active })} className="rounded-lg px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-200">{e.active ? "Desactivar" : "Activar"}</button>
                    <button onClick={() => startEdit(e)} className="rounded-lg px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-200">Editar</button>
                    <button onClick={() => { if (confirm(`¿Eliminar a ${e.name}? Se borran también sus jornadas.`)) removeEmployee(e.id); }} className="rounded-lg px-2 py-1 text-sm text-red-500 hover:bg-red-50">Eliminar</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

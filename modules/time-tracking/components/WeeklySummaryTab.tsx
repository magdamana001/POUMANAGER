"use client";

import { useMemo, useState } from "react";
import { useConfig } from "@/core/config/ConfigProvider";
import { useTimeTracking } from "../store";
import { useRounding } from "../hooks";
import {
  addDays,
  computeWeekly,
  DAY_NAMES,
  formatHours,
  formatMoney,
  getWeekStart,
  todayISO,
  weekLabel,
} from "../utils";
import { downloadDataUrl, renderWeeklySummary } from "../summaryImage";

export function WeeklySummaryTab() {
  const { employees, sessions } = useTimeTracking();
  const { config } = useConfig();
  const rounding = useRounding();
  const [employeeId, setEmployeeId] = useState("");
  const [weekStart, setWeekStart] = useState(getWeekStart(todayISO()));

  const currency = config.general.currency;
  const activeEmployees = useMemo(() => employees.filter((e) => e.active), [employees]);
  const selected = activeEmployees.find((e) => e.id === employeeId) ?? activeEmployees[0];

  const result = useMemo(
    () => (selected ? computeWeekly(selected, sessions, weekStart, rounding) : null),
    [selected, sessions, weekStart, rounding]
  );

  const team = useMemo(
    () => activeEmployees.map((e) => computeWeekly(e, sessions, weekStart, rounding)),
    [activeEmployees, sessions, weekStart, rounding]
  );
  const grandTotal = team.reduce((a, r) => a + r.totalPay, 0);
  const grandHours = team.reduce((a, r) => a + r.totalHours, 0);

  if (activeEmployees.length === 0) {
    return <p className="text-sm text-neutral-400">Añade empleados activos y registra jornadas.</p>;
  }

  const downloadImage = () => {
    if (!result) return;
    const dataUrl = renderWeeklySummary(result, {
      businessName: config.general.businessName,
      brandColor: config.general.brandColor,
      currency,
    });
    downloadDataUrl(dataUrl, `resumen_${result.employee.name.replace(/\s+/g, "_")}_${result.weekStart}.png`);
  };

  const exportCsv = () => {
    const rows = [
      ["Empleado", "Puesto", "Horas", "Contrato", "Extras", "A pagar"],
      ...team.map((r) => [
        r.employee.name,
        r.employee.position,
        r.totalHours.toFixed(2),
        r.employee.contractHours.toFixed(2),
        r.extraHours.toFixed(2),
        r.totalPay.toFixed(2),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resumen_equipo_${weekStart}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <select
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          value={selected?.id}
          onChange={(e) => setEmployeeId(e.target.value)}
        >
          {activeEmployees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100">
            ‹ Semana
          </button>
          <span className="min-w-[150px] text-center text-sm font-medium">{weekLabel(weekStart)}</span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100">
            Semana ›
          </button>
          <button onClick={() => setWeekStart(getWeekStart(todayISO()))} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100">
            Hoy
          </button>
        </div>
      </div>

      {result && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Detalle por día */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Horas por día — {result.employee.name}</h2>
            <ul className="divide-y divide-neutral-100">
              {result.days.map((d) => (
                <li key={d.dayIndex} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="flex w-20 shrink-0 items-center gap-1.5">
                    <span className="text-neutral-600">{DAY_NAMES[d.dayIndex]}</span>
                    {d.isSplit && (
                      <span className="rounded bg-brand-soft px-1 text-[10px] font-medium text-brand">
                        partida
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-neutral-500">
                    {d.segments.length === 0 ? (
                      <span className="text-neutral-300">Descanso</span>
                    ) : (
                      d.segments.map((s, i) => (
                        <span key={i} className="mr-2 whitespace-nowrap">
                          {s.start}–{s.end}
                        </span>
                      ))
                    )}
                  </div>
                  <span className={d.total > 0 ? "font-semibold" : "text-neutral-400"}>
                    {d.total > 0 ? formatHours(d.total) : "—"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-neutral-400">{result.sessionCount} jornadas esta semana</p>
          </div>

          {/* Totales y pago */}
          <div className="space-y-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold">Cálculo semanal</h2>
              <dl className="space-y-2 text-sm">
                <Row label="Horas trabajadas" value={formatHours(result.totalHours)} />
                <Row label="Horas por contrato" value={formatHours(result.employee.contractHours)} />
                <Row label="Horas extra" value={formatHours(result.extraHours)} highlight />
                <Row label={`Precio hora extra`} value={formatMoney(result.employee.extraHourPrice, currency)} />
              </dl>
            </div>

            <div className="rounded-xl bg-brand p-5 text-white shadow-sm">
              <p className="text-sm opacity-90">Total a pagar (horas extra)</p>
              <p className="text-3xl font-bold">{formatMoney(result.totalPay, currency)}</p>
            </div>

            <button onClick={downloadImage} className="w-full rounded-lg border-2 border-brand py-3 font-medium text-brand hover:bg-brand-soft">
              ⬇ Descargar resumen en imagen (PNG)
            </button>
          </div>
        </div>
      )}

      {/* Resumen del equipo */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Resumen del equipo — {weekLabel(weekStart)}</h2>
          <button onClick={exportCsv} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100">
            ⬇ CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-400">
                <th className="py-2">Empleado</th>
                <th className="py-2 text-right">Horas</th>
                <th className="py-2 text-right">Extra</th>
                <th className="py-2 text-right">A pagar</th>
              </tr>
            </thead>
            <tbody>
              {team.map((r) => (
                <tr key={r.employee.id} className="border-b border-neutral-50">
                  <td className="py-2">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: r.employee.color }} />
                    {r.employee.name}
                  </td>
                  <td className="py-2 text-right">{formatHours(r.totalHours)}</td>
                  <td className="py-2 text-right text-brand">{formatHours(r.extraHours)}</td>
                  <td className="py-2 text-right font-medium">{formatMoney(r.totalPay, currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="py-2">Total</td>
                <td className="py-2 text-right">{formatHours(grandHours)}</td>
                <td className="py-2 text-right" />
                <td className="py-2 text-right text-brand">{formatMoney(grandTotal, currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-neutral-600">{label}</dt>
      <dd className={highlight ? "font-bold text-brand" : "font-medium"}>{value}</dd>
    </div>
  );
}

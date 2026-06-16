"use client";

import { useMemo, useState } from "react";
import { useConfig } from "@/core/config/ConfigProvider";
import { useTimeTracking } from "../store";
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
  const [employeeId, setEmployeeId] = useState("");
  const [weekStart, setWeekStart] = useState(getWeekStart(todayISO()));

  const currency = config.general.currency;
  const selected = employees.find((e) => e.id === employeeId) ?? employees[0];

  const result = useMemo(
    () => (selected ? computeWeekly(selected, sessions, weekStart) : null),
    [selected, sessions, weekStart]
  );

  if (employees.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        Primero añade empleados y registra jornadas.
      </p>
    );
  }

  const download = () => {
    if (!result) return;
    const dataUrl = renderWeeklySummary(result, {
      businessName: config.general.businessName,
      brandColor: config.general.brandColor,
      currency,
    });
    downloadDataUrl(
      dataUrl,
      `resumen_${result.employee.name.replace(/\s+/g, "_")}_${result.weekStart}.png`
    );
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
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
          >
            ‹ Semana
          </button>
          <span className="min-w-[140px] text-center text-sm font-medium">
            {weekLabel(weekStart)}
          </span>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
          >
            Semana ›
          </button>
        </div>
      </div>

      {result && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Detalle por día */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold">Horas por día</h2>
            <ul className="divide-y divide-neutral-100">
              {result.perDay.map((h, i) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-neutral-600">{DAY_NAMES[i]}</span>
                  <span className={h > 0 ? "font-semibold" : "text-neutral-400"}>
                    {h > 0 ? formatHours(h) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Totales y pago */}
          <div className="space-y-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-semibold">Cálculo semanal</h2>
              <dl className="space-y-2 text-sm">
                <Row label="Horas trabajadas" value={formatHours(result.totalHours)} />
                <Row label="Horas por contrato" value={formatHours(result.employee.contractHours)} />
                <Row
                  label="Horas extra"
                  value={formatHours(result.extraHours)}
                  highlight
                />
                <Row
                  label={`Pago extra (${formatMoney(result.employee.extraHourPrice, currency)}/h)`}
                  value={formatMoney(result.extraPay, currency)}
                />
              </dl>
            </div>

            <div className="rounded-xl bg-brand p-5 text-white shadow-sm">
              <p className="text-sm opacity-90">Total a pagar esta semana</p>
              <p className="text-3xl font-bold">{formatMoney(result.totalPay, currency)}</p>
            </div>

            <button
              onClick={download}
              className="w-full rounded-lg border-2 border-brand py-3 font-medium text-brand hover:bg-brand-soft"
            >
              ⬇ Descargar resumen en imagen (PNG)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-neutral-600">{label}</dt>
      <dd className={highlight ? "font-bold text-brand" : "font-medium"}>{value}</dd>
    </div>
  );
}

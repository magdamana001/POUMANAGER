/** Utilidades de formato compartidas (moneda, etc.). */

export function currencySymbol(currency: string): string {
  return { EUR: "€", USD: "$", GBP: "£" }[currency] ?? currency;
}

/** Importe formateado con símbolo. Tolera valores nulos/indefinidos. */
export function formatMoney(amount: number, currency: string): string {
  return `${(amount ?? 0).toFixed(2)} ${currencySymbol(currency)}`;
}

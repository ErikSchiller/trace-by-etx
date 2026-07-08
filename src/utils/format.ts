export type CurrencyCode = 'USD' | 'EUR' | 'GBP';

/**
 * Locale-aware currency formatting via Intl.NumberFormat.
 * Defaults to es-ES + EUR.
 */
export function formatCurrency(value: number, currency: CurrencyCode = 'EUR'): string {
  if (!isFinite(value)) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Signed currency, e.g. "+1.234,00 €" / "-99,00 €". */
export function formatSignedCurrency(value: number, currency: CurrencyCode = 'EUR'): string {
  if (!isFinite(value)) return '—';
  const sign = value >= 0 ? '+' : '';
  return sign + formatCurrency(value, currency);
}

/** "26 jun 2026, 14:32" in the given timezone. */
export function formatDateTime(iso: string, timeZone = 'Europe/Madrid'): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone,
  }).format(d);
}

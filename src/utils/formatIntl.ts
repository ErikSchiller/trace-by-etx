import i18n from '../i18n/i18n';

/** Locale for Intl based on the active app language. */
function activeLocale(): string {
  return i18n.language === 'en' ? 'en-US' : 'es-ES';
}

const CURRENCY_BY_SYMBOL: Record<string, string> = { '$': 'USD', '€': 'EUR', '£': 'GBP' };

/**
 * Locale-aware currency: en → $1,234.56, es → 1.234,56 €.
 * Accepts either an ISO code ('EUR') or a symbol ('€').
 */
export function formatCurrency(value: number, currency: string = 'EUR'): string {
  const code = CURRENCY_BY_SYMBOL[currency] ?? currency;
  try {
    return new Intl.NumberFormat(activeLocale(), { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency}${value.toLocaleString(activeLocale())}`;
  }
}

/** Signed currency ("+$1,200" / "-1.234,56 €") — sign always shown. */
export function formatSignedCurrency(value: number, currency: string = 'EUR'): string {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${formatCurrency(Math.abs(value), currency)}`;
}

/** Locale-aware number. */
export function formatNumber(value: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(activeLocale(), opts).format(value);
}

/** Locale-aware date. `iso` may be YYYY-MM-DD or an ISO datetime. */
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  const d = iso.length <= 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(activeLocale(), opts).format(d);
}

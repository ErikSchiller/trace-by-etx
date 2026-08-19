import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DatePreset =
  | 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month'
  | 'last_30' | 'last_90' | 'this_year' | 'custom';

interface DateRangeStore {
  preset: DatePreset;
  from: string | null; // ISO YYYY-MM-DD (custom)
  to: string | null;
  setPreset: (p: DatePreset) => void;
  setCustom: (from: string | null, to: string | null) => void;
  reset: () => void;
}

export const useDateRangeStore = create<DateRangeStore>()(
  persist(
    (set) => ({
      preset: 'all',
      from: null,
      to: null,
      setPreset: (preset) => set({ preset }),
      setCustom: (from, to) => set({ preset: 'custom', from, to }),
      reset: () => set({ preset: 'all', from: null, to: null }),
    }),
    { name: 'trace_date_range' }
  )
);

export const PRESET_LABEL: Record<DatePreset, string> = {
  all: 'Todo el tiempo',
  today: 'Hoy',
  yesterday: 'Ayer',
  this_week: 'Esta semana',
  this_month: 'Este mes',
  last_30: 'Últimos 30 días',
  last_90: 'Últimos 90 días',
  this_year: 'Este año',
  custom: 'Personalizado',
};

function iso(d: Date) { return d.toISOString().slice(0, 10); }

/** Resolve a preset/custom state to a concrete {from,to} or null (all time). */
export function resolveRange(state: { preset: DatePreset; from: string | null; to: string | null }): { from: string; to: string } | null {
  const now = new Date();
  const today = iso(now);
  const startOf = (d: Date) => { d.setHours(0, 0, 0, 0); return d; };
  switch (state.preset) {
    case 'all': return null;
    case 'today': return { from: today, to: today };
    case 'yesterday': { const y = new Date(now); y.setDate(y.getDate() - 1); return { from: iso(y), to: iso(y) }; }
    case 'this_week': { const d = startOf(new Date(now)); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return { from: iso(d), to: today }; }
    case 'this_month': { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { from: iso(d), to: today }; }
    case 'last_30': { const d = new Date(now); d.setDate(d.getDate() - 29); return { from: iso(d), to: today }; }
    case 'last_90': { const d = new Date(now); d.setDate(d.getDate() - 89); return { from: iso(d), to: today }; }
    case 'this_year': { const d = new Date(now.getFullYear(), 0, 1); return { from: iso(d), to: today }; }
    case 'custom': return state.from && state.to ? { from: state.from, to: state.to } : null;
    default: return null;
  }
}

/** Label describing the period a comparison is made against (e.g. "mes anterior"). */
export const COMPARE_LABEL: Partial<Record<DatePreset, string>> = {
  today: 'ayer',
  yesterday: 'día anterior',
  this_week: 'semana anterior',
  this_month: 'mes anterior',
  last_30: '30 días anteriores',
  last_90: '90 días anteriores',
  this_year: 'año anterior',
  custom: 'periodo anterior',
};

function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000) + 1;
}
function shift(key: string, days: number) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() - days);
  return iso(d);
}

/**
 * Resolve the comparison period for a preset/custom state. Returns null when no
 * meaningful comparison exists (all-time, or incomplete custom range).
 * Month/year compare like-for-like to-date against the previous calendar month/year.
 */
export function resolvePreviousRange(state: { preset: DatePreset; from: string | null; to: string | null }): { from: string; to: string } | null {
  if (state.preset === 'all') return null;
  const cur = resolveRange(state);
  if (!cur) return null;

  if (state.preset === 'this_month') {
    const now = new Date();
    const prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastOfPrev = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const prevTo = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), lastOfPrev));
    return { from: iso(prevFrom), to: iso(prevTo) };
  }
  if (state.preset === 'this_year') {
    const now = new Date();
    const y = now.getFullYear() - 1;
    const prevFrom = new Date(y, 0, 1);
    const lastOfMonth = new Date(y, now.getMonth() + 1, 0).getDate();
    const prevTo = new Date(y, now.getMonth(), Math.min(now.getDate(), lastOfMonth));
    return { from: iso(prevFrom), to: iso(prevTo) };
  }
  // Default: same-length window immediately before the current one.
  const len = daysBetween(cur.from, cur.to);
  return { from: shift(cur.from, len), to: shift(cur.from, 1) };
}

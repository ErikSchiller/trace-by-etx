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

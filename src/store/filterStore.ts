import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Direction, Session } from './tradeStore';

export type TradeStatus = 'win' | 'loss' | 'be';

export interface TradeFilters {
  assets: string[];
  directions: Direction[];
  sessions: Session[];
  setups: string[];
  statuses: TradeStatus[];
  accountId: string; // '' = todas
}

interface FilterStore extends TradeFilters {
  setFilters: (f: Partial<TradeFilters>) => void;
  clearFilters: () => void;
}

const EMPTY: TradeFilters = { assets: [], directions: [], sessions: [], setups: [], statuses: [], accountId: '' };

export const useFilterStore = create<FilterStore>()(
  persist(
    (set) => ({
      ...EMPTY,
      setFilters: (f) => set(f),
      clearFilters: () => set(EMPTY),
    }),
    { name: 'trace_filters' }
  )
);

export function activeFilterCount(f: TradeFilters): number {
  let n = 0;
  if (f.assets.length) n++;
  if (f.directions.length) n++;
  if (f.sessions.length) n++;
  if (f.setups.length) n++;
  if (f.statuses.length) n++;
  if (f.accountId) n++;
  return n;
}

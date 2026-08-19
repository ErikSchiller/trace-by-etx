import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { useAuthStore } from './authStore';
import { useFilterStore, type TradeFilters } from './filterStore';
import { useDateRangeStore, resolveRange } from './dateRangeStore';
import { useUndoStore } from './undoStore';

/**
 * Cascade-delete notes linked to trades, decoupled from notebookStore to avoid a
 * cross-store import (which would code-split notebookStore and break prod init order).
 * notebookStore registers the handler on window when it initialises.
 */
function deleteLinkedTradeNotes(ids: string[]) {
  const w = window as unknown as { __traceNoteCascade?: (ids: string[]) => void };
  w.__traceNoteCascade?.(ids);
}

export type Direction = 'long' | 'short';
export type Session = 'london' | 'new_york' | 'asia' | 'premarket';
export type ExitType = 'sl_hit' | 'tp_hit' | 'manual';
export type EmotionalState = 1 | 2 | 3 | 4 | 5;
export type InputMode = 'direct' | 'calculated';

export interface Trade {
  id: string;
  userId: string;
  date: string;        // YYYY-MM-DD
  time: string;        // HH:MM
  asset: string;
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  commission: number;
  multiplier: number;
  pnl: number;
  grossPnl: number;
  plannedRR: number;
  realRR: number;
  session: Session;
  setup: string;
  emotionalState: EmotionalState;
  isPlanBased: boolean;
  exitType: ExitType;
  errorTags: string[];
  entryReason: string;
  postTradeNotes: string;
  screenshots: string[];
  createdAt: string;
  inputMode: InputMode;
  /** Optional link to a prop firm account (propFirmStore). */
  accountId?: string;
  /** Free-text note written when adding the trade (max 500 chars). */
  quickNote?: string;
  /** Links trades logged together across multiple accounts (same entry). */
  groupId?: string;
  /** Convenience flag — the trade was logged as part of a multi-account group. */
  isMultiAccount?: boolean;
}

export type NewTradeInput = Omit<Trade, 'id' | 'userId' | 'pnl' | 'grossPnl' | 'plannedRR' | 'realRR' | 'createdAt'> & {
  /** When provided (direct mode), pnl is taken as-is instead of computed from prices. */
  directPnl?: number;
};

interface TradeStore {
  trades: Trade[];
  addTrade: (input: NewTradeInput) => Trade;
  updateTrade: (id: string, updates: Partial<Trade>) => void;
  /** Apply the same updates to every trade in a group (each keeps its own accountId). */
  updateGroup: (groupId: string, updates: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
  deleteMany: (ids: string[]) => void;
  /** Delete every trade in a group (and their linked notes). */
  deleteGroup: (groupId: string) => void;
  clearAll: () => void;
}

export function calcGrossPnl(t: { direction: Direction; entryPrice: number; exitPrice: number; positionSize: number; multiplier: number }) {
  const diff = t.direction === 'long' ? (t.exitPrice - t.entryPrice) : (t.entryPrice - t.exitPrice);
  return diff * t.positionSize * (t.multiplier || 1);
}

export function calcPlannedRR(t: { entryPrice: number; stopLoss: number; takeProfit: number }) {
  const risk = Math.abs(t.entryPrice - t.stopLoss);
  if (risk === 0) return 0;
  return Math.abs(t.takeProfit - t.entryPrice) / risk;
}

export function calcRealRR(t: { entryPrice: number; stopLoss: number; positionSize: number; multiplier: number; pnl: number }) {
  const riskPerUnit = Math.abs(t.entryPrice - t.stopLoss);
  const risk = riskPerUnit * t.positionSize * (t.multiplier || 1);
  if (risk === 0) return 0;
  return t.pnl / risk;
}

export const useTradeStore = create<TradeStore>()(
  persist(
    (set) => ({
      trades: [],

      addTrade: (input) => {
        const userId = useAuthStore.getState().user?.id ?? 'anonymous';
        const { directPnl, ...rest } = input;
        const isDirect = input.inputMode === 'direct' && directPnl !== undefined;
        // Direct mode: PnL is what the user typed; grossPnl = pnl + commission.
        const pnl = isDirect ? directPnl! : calcGrossPnl(input) - (input.commission || 0);
        const grossPnl = isDirect ? directPnl! + (input.commission || 0) : calcGrossPnl(input);
        const plannedRR = isDirect ? 0 : calcPlannedRR(input);
        const realRR = isDirect ? 0 : calcRealRR({ ...input, pnl });
        const trade: Trade = {
          ...rest,
          id: nanoid(),
          userId,
          grossPnl,
          pnl,
          plannedRR,
          realRR,
          createdAt: new Date().toISOString(),
        };
        set(s => ({ trades: [...s.trades, trade] }));
        return trade;
      },

      updateTrade: (id, updates) => {
        set(s => ({
          trades: s.trades.map(t => {
            if (t.id !== id) return t;
            const merged = { ...t, ...updates };
            if (merged.inputMode === 'direct') {
              // Keep the user-entered pnl; derive grossPnl from it.
              const pnl = updates.pnl !== undefined ? updates.pnl : merged.pnl;
              return { ...merged, pnl, grossPnl: pnl + (merged.commission || 0), plannedRR: 0, realRR: 0 };
            }
            const grossPnl = calcGrossPnl(merged);
            const pnl = grossPnl - (merged.commission || 0);
            return {
              ...merged,
              grossPnl,
              pnl,
              plannedRR: calcPlannedRR(merged),
              realRR: calcRealRR({ ...merged, pnl }),
            };
          }),
        }));
      },

      updateGroup: (groupId, updates) => {
        // Never let group updates change per-account identity fields.
        const { accountId: _a, groupId: _g, id: _i, userId: _u, ...safe } = updates as Partial<Trade>;
        void _a; void _g; void _i; void _u;
        set(s => ({
          trades: s.trades.map(t => {
            if (t.groupId !== groupId) return t;
            const merged = { ...t, ...safe };
            if (merged.inputMode === 'direct') {
              const pnl = updates.pnl !== undefined ? updates.pnl : merged.pnl;
              return { ...merged, pnl, grossPnl: pnl + (merged.commission || 0), plannedRR: 0, realRR: 0 };
            }
            const grossPnl = calcGrossPnl(merged);
            const pnl = grossPnl - (merged.commission || 0);
            return { ...merged, grossPnl, pnl, plannedRR: calcPlannedRR(merged), realRR: calcRealRR({ ...merged, pnl }) };
          }),
        }));
      },

      deleteTrade: (id) => {
        let removed: Trade | undefined;
        set(s => {
          removed = s.trades.find(t => t.id === id);
          return { trades: s.trades.filter(t => t.id !== id) };
        });
        deleteLinkedTradeNotes([id]);
        if (removed) {
          const trade = removed;
          useUndoStore.getState().register({
            message: 'Operación eliminada',
            execute: () => set(s => (s.trades.some(t => t.id === trade.id) ? s : { trades: [...s.trades, trade] })),
          });
        }
      },
      deleteMany: (ids) => {
        set(s => ({ trades: s.trades.filter(t => !ids.includes(t.id)) }));
        deleteLinkedTradeNotes(ids);
      },
      deleteGroup: (groupId) => {
        let removed: string[] = [];
        set(s => {
          removed = s.trades.filter(t => t.groupId === groupId).map(t => t.id);
          return { trades: s.trades.filter(t => t.groupId !== groupId) };
        });
        deleteLinkedTradeNotes(removed);
      },
      clearAll: () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        set(s => ({ trades: s.trades.filter(t => t.userId !== userId) }));
      },
    }),
    { name: 'trace_trades' }
  )
);

/* ============ Selectors (functions, not memoized — call from components) ============ */

export function getUserTrades(): Trade[] {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return [];
  return useTradeStore.getState().trades
    .filter(t => t.userId === userId)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}

export function useUserTrades(): Trade[] {
  const userId = useAuthStore(s => s.user?.id);
  const trades = useTradeStore(s => s.trades);
  if (!userId) return [];
  return trades
    .filter(t => t.userId === userId)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}

/** Apply the global filters + date range to a list of trades. */
export function filterTrades(trades: Trade[], f: TradeFilters, range: { from: string; to: string } | null): Trade[] {
  return trades.filter(t => {
    if (f.assets.length && !f.assets.includes(t.asset)) return false;
    if (f.directions.length && !f.directions.includes(t.direction)) return false;
    if (f.sessions.length && !f.sessions.includes(t.session)) return false;
    if (f.setups.length && !f.setups.includes(t.setup)) return false;
    if (f.statuses.length) {
      const st = t.pnl > 0 ? 'win' : t.pnl < 0 ? 'loss' : 'be';
      if (!f.statuses.includes(st)) return false;
    }
    if (f.accountId && t.accountId !== f.accountId) return false;
    if (range && (t.date < range.from || t.date > range.to)) return false;
    return true;
  });
}

/**
 * User trades with the global Filtros + Fechas applied. Display pages
 * (Dashboard, Diario, Operaciones, Reportes) use this so filters are global.
 */
export function useFilteredTrades(): Trade[] {
  const trades = useUserTrades();
  const assets = useFilterStore(s => s.assets);
  const directions = useFilterStore(s => s.directions);
  const sessions = useFilterStore(s => s.sessions);
  const setups = useFilterStore(s => s.setups);
  const statuses = useFilterStore(s => s.statuses);
  const accountId = useFilterStore(s => s.accountId);
  const preset = useDateRangeStore(s => s.preset);
  const from = useDateRangeStore(s => s.from);
  const to = useDateRangeStore(s => s.to);
  return useMemo(() => {
    const range = resolveRange({ preset, from, to });
    return filterTrades(trades, { assets, directions, sessions, setups, statuses, accountId }, range);
  }, [trades, assets, directions, sessions, setups, statuses, accountId, preset, from, to]);
}

export function getTradesByDate(trades: Trade[], date: string) {
  return trades.filter(t => t.date === date);
}

export function getDailyPnL(trades: Trade[], date: string) {
  return getTradesByDate(trades, date).reduce((sum, t) => sum + t.pnl, 0);
}

export function getMonthlyPnL(trades: Trade[], year: number, month: number) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTrades = trades.filter(t => t.date.startsWith(prefix));
  const byDay: Record<string, number> = {};
  monthTrades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl; });
  const days = Object.values(byDay);
  const winDays = days.filter(p => p > 0).length;
  const lossDays = days.filter(p => p < 0).length;
  const pnl = monthTrades.reduce((s, t) => s + t.pnl, 0);
  return { pnl, trades: monthTrades.length, winDays, lossDays, byDay };
}

export function getCumulativePnL(trades: Trade[]) {
  return trades.reduce((s, t) => s + t.pnl, 0);
}

export function getWinRate(trades: Trade[], beAsWin = false) {
  if (trades.length === 0) return 0;
  const wins = trades.filter(t => t.pnl > 0 || (beAsWin && t.pnl === 0)).length;
  return (wins / trades.length) * 100;
}

export function getProfitFactor(trades: Trade[]) {
  const gross = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const losses = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  if (losses === 0) return gross > 0 ? Infinity : 0;
  return gross / losses;
}

export function getAvgWin(trades: Trade[]) {
  const wins = trades.filter(t => t.pnl > 0);
  if (wins.length === 0) return 0;
  return wins.reduce((s, t) => s + t.pnl, 0) / wins.length;
}

export function getAvgLoss(trades: Trade[]) {
  const losses = trades.filter(t => t.pnl < 0);
  if (losses.length === 0) return 0;
  return losses.reduce((s, t) => s + t.pnl, 0) / losses.length;
}

export function getDayWinRate(trades: Trade[]) {
  const byDay: Record<string, number> = {};
  trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl; });
  const days = Object.values(byDay);
  if (days.length === 0) return 0;
  return (days.filter(p => p > 0).length / days.length) * 100;
}

export function getMaxDrawdown(trades: Trade[]) {
  // sort chronologically
  const sorted = [...trades].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  let peak = 0, cum = 0, maxDD = 0;
  for (const t of sorted) {
    cum += t.pnl;
    peak = Math.max(peak, cum);
    maxDD = Math.min(maxDD, cum - peak);
  }
  return Math.abs(maxDD);
}

export function getEquityCurve(trades: Trade[]) {
  const sorted = [...trades].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const out: { date: string; cumPnl: number }[] = [];
  let cum = 0;
  for (const t of sorted) {
    cum += t.pnl;
    out.push({ date: t.date, cumPnl: cum });
  }
  return out;
}

export function getRecentTrades(trades: Trade[], limit: number) {
  return trades.slice(0, limit);
}

export function getTraceScore(trades: Trade[]) {
  if (trades.length === 0) return 0;
  const winRate = getWinRate(trades) / 100;          // 0..1
  const pf = getProfitFactor(trades);
  const pfNorm = Math.min(pf / 3, 1);                 // pf 3 = max
  const avgWin = getAvgWin(trades);
  const avgLoss = Math.abs(getAvgLoss(trades));
  const ratio = avgLoss > 0 ? Math.min(avgWin / avgLoss / 2, 1) : (avgWin > 0 ? 1 : 0);
  // consistency = 1 - stdev(daily pnl)/range, simplified
  const byDay: Record<string, number> = {};
  trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl; });
  const dayVals = Object.values(byDay);
  const mean = dayVals.reduce((s, v) => s + v, 0) / (dayVals.length || 1);
  const variance = dayVals.reduce((s, v) => s + (v - mean) ** 2, 0) / (dayVals.length || 1);
  const stdev = Math.sqrt(variance);
  const consistency = stdev === 0 ? 1 : Math.max(0, 1 - stdev / (Math.abs(mean) * 4 + 1));
  // recovery: cumPnl / maxDrawdown
  const cum = getCumulativePnL(trades);
  const dd = getMaxDrawdown(trades);
  const recovery = dd === 0 ? (cum > 0 ? 1 : 0.5) : Math.min(Math.max(cum / dd, 0) / 3, 1);
  const score = (winRate * 0.25 + pfNorm * 0.25 + ratio * 0.2 + consistency * 0.15 + recovery * 0.15) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function groupTradesByDate(trades: Trade[]) {
  const map: Record<string, Trade[]> = {};
  for (const t of trades) {
    (map[t.date] ||= []).push(t);
  }
  // sort each day chronologically
  for (const d in map) map[d].sort((a, b) => a.time.localeCompare(b.time));
  return map;
}

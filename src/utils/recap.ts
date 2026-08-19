import type { Trade, Session } from '../store/tradeStore';
import type { Note } from '../store/notebookStore';
import type { Routine } from '../store/routineStore';

const SESSION_LABEL: Record<Session, string> = {
  london: 'sesión de Londres',
  new_york: 'sesión de Nueva York',
  asia: 'sesión asiática',
  premarket: 'premarket',
};

export interface RecapDay { date: string; pnl: number; count: number; routineDone: number }

export interface RecapData {
  fromDate: string;
  toDate: string;
  tradingDays: number;
  totalTrades: number;
  netPnl: number;
  prevNetPnl: number | null;
  deltaPct: number | null;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  bestDay: { date: string; pnl: number; count: number } | null;
  worstDay: { date: string; pnl: number; count: number } | null;
  winRate: number;
  profitFactor: number;
  avgWL: number;
  insights: string[];
  routineTotal: number;
  days: RecapDay[];
}

function iso(d: Date) { return d.toISOString().slice(0, 10); }

/** Returns the 7 calendar-day window ending today: [today-6 .. today]. */
export function weekWindow(ref = new Date()): { from: string; to: string; keys: string[] } {
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(ref); d.setDate(ref.getDate() - i); keys.push(iso(d)); }
  return { from: keys[0], to: keys[keys.length - 1], keys };
}

/** Count of distinct trading days in the last 7 days — used to gate the recap prompt. */
export function tradingDaysLast7(trades: Trade[]): number {
  const { keys } = weekWindow();
  const set = new Set(keys);
  return new Set(trades.filter(t => set.has(t.date)).map(t => t.date)).size;
}

export interface RecapInputs {
  trades: Trade[];
  notes: Note[];
  routine: Routine | null;
  completions: Record<string, string[]>;
  beCountsAsWin: boolean;
}

export function computeWeeklyRecap({ trades, routine, completions, beCountsAsWin }: RecapInputs): RecapData {
  const { from, to, keys } = weekWindow();
  const inWindow = new Set(keys);
  const week = trades.filter(t => inWindow.has(t.date));

  // Previous 7-day window
  const prevKeys: string[] = [];
  const start = new Date(`${from}T00:00:00`);
  for (let i = 7; i >= 1; i--) { const d = new Date(start); d.setDate(start.getDate() - i); prevKeys.push(iso(d)); }
  const prevSet = new Set(prevKeys);
  const prevWeek = trades.filter(t => prevSet.has(t.date));

  const netPnl = week.reduce((s, t) => s + t.pnl, 0);
  const prevNetPnl = prevWeek.length > 0 ? prevWeek.reduce((s, t) => s + t.pnl, 0) : null;
  const deltaPct = prevNetPnl && prevNetPnl !== 0 ? ((netPnl - prevNetPnl) / Math.abs(prevNetPnl)) * 100 : null;

  const byDay = new Map<string, { pnl: number; count: number }>();
  for (const t of week) {
    const cur = byDay.get(t.date) ?? { pnl: 0, count: 0 };
    cur.pnl += t.pnl; cur.count += 1;
    byDay.set(t.date, cur);
  }

  const sorted = [...week].sort((a, b) => b.pnl - a.pnl);
  const bestTrade = sorted[0] ?? null;
  const worstTrade = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  let bestDay: RecapData['bestDay'] = null;
  let worstDay: RecapData['worstDay'] = null;
  for (const [date, agg] of byDay) {
    if (!bestDay || agg.pnl > bestDay.pnl) bestDay = { date, pnl: agg.pnl, count: agg.count };
    if (!worstDay || agg.pnl < worstDay.pnl) worstDay = { date, pnl: agg.pnl, count: agg.count };
  }

  const wins = week.filter(t => t.pnl > 0 || (beCountsAsWin && t.pnl === 0)).length;
  const winRate = week.length > 0 ? (wins / week.length) * 100 : 0;
  const grossWin = week.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(week.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss === 0 ? (grossWin > 0 ? Infinity : 0) : grossWin / grossLoss;
  const avgWinArr = week.filter(t => t.pnl > 0);
  const avgLossArr = week.filter(t => t.pnl < 0);
  const avgWin = avgWinArr.length ? avgWinArr.reduce((s, t) => s + t.pnl, 0) / avgWinArr.length : 0;
  const avgLoss = avgLossArr.length ? Math.abs(avgLossArr.reduce((s, t) => s + t.pnl, 0) / avgLossArr.length) : 0;
  const avgWL = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? avgWin : 0);

  // Routine per-day completion in window
  const habitIds = routine ? new Set(routine.habits.map(h => h.id)) : new Set<string>();
  const routineTotal = routine?.habits.length ?? 0;
  const days: RecapDay[] = keys.map(date => {
    const agg = byDay.get(date);
    const done = (completions[date] ?? []).filter(id => habitIds.has(id)).length;
    return { date, pnl: agg?.pnl ?? 0, count: agg?.count ?? 0, routineDone: done };
  });

  // Insights (only bullets with real data)
  const insights: string[] = [];
  if (week.length > 0) {
    const bySession = new Map<Session, number>();
    for (const t of week) bySession.set(t.session, (bySession.get(t.session) ?? 0) + 1);
    let domSession: Session | null = null; let domCount = 0;
    for (const [s, c] of bySession) if (c > domCount) { domSession = s; domCount = c; }
    if (domSession && domCount >= 2) insights.push(`Operaste principalmente en ${SESSION_LABEL[domSession]} (${domCount} de ${week.length} ops)`);

    const bySetup = new Map<string, { net: number; n: number }>();
    for (const t of week) { const k = t.setup || 'Sin setup'; const cur = bySetup.get(k) ?? { net: 0, n: 0 }; cur.net += t.pnl; cur.n += 1; bySetup.set(k, cur); }
    let bestSetup: { name: string; net: number; n: number } | null = null;
    for (const [name, v] of bySetup) if (v.n >= 2 && (!bestSetup || v.net > bestSetup.net)) bestSetup = { name, ...v };
    if (bestSetup && bestSetup.net > 0) insights.push(`Tu mejor setup esta semana: ${bestSetup.name} con +$${Math.round(bestSetup.net).toLocaleString('en-US')} en ${bestSetup.n} trades`);

    const byTag = new Map<string, number>();
    for (const t of week) for (const tag of t.errorTags ?? []) byTag.set(tag, (byTag.get(tag) ?? 0) + 1);
    let topTag: string | null = null; let topTagN = 0;
    for (const [tag, n] of byTag) if (n > topTagN) { topTag = tag; topTagN = n; }
    if (topTag && topTagN >= 2) insights.push(`Tag de error más frecuente: ${topTag} en ${topTagN} trades`);
  }
  if (routine && routineTotal > 0) {
    const full = days.filter(d => d.routineDone >= routineTotal).length;
    insights.push(`Cumpliste tu checklist ${full}/7 días esta semana`);
  }

  return {
    fromDate: from, toDate: to,
    tradingDays: byDay.size,
    totalTrades: week.length,
    netPnl, prevNetPnl, deltaPct,
    bestTrade, worstTrade, bestDay, worstDay,
    winRate, profitFactor, avgWL,
    insights, routineTotal, days,
  };
}

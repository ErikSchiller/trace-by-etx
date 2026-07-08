import type { Trade } from '../types';

export function calcPnL(
  direction: 'long' | 'short',
  entry: number,
  exit: number,
  size: number,
  commission = 0
): number {
  const raw = direction === 'long' ? (exit - entry) * size : (entry - exit) * size;
  return parseFloat((raw - commission).toFixed(2));
}

export function calcPlannedRR(
  _direction: 'long' | 'short',
  entry: number,
  sl: number,
  tp: number
): number {
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (risk === 0) return 0;
  return parseFloat((reward / risk).toFixed(2));
}

export function calcRealRR(
  direction: 'long' | 'short',
  entry: number,
  sl: number,
  exit: number
): number {
  const risk = Math.abs(entry - sl);
  if (risk === 0) return 0;
  const realized = direction === 'long' ? exit - entry : entry - exit;
  return parseFloat((realized / risk).toFixed(2));
}

export function getWinRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const winners = trades.filter(t => t.pnl > 0).length;
  return parseFloat(((winners / trades.length) * 100).toFixed(1));
}

export function getAvgRR(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const sum = trades.reduce((acc, t) => acc + t.realRR, 0);
  return parseFloat((sum / trades.length).toFixed(2));
}

export function getTotalPnL(trades: Trade[]): number {
  return parseFloat(trades.reduce((acc, t) => acc + t.pnl, 0).toFixed(2));
}

export function getTodayTrades(trades: Trade[]): Trade[] {
  const today = new Date().toISOString().split('T')[0];
  return trades.filter(t => t.date === today);
}

export function getWeekTrades(trades: Trade[]): Trade[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  monday.setHours(0, 0, 0, 0);
  return trades.filter(t => new Date(t.date) >= monday);
}

export function getMonthTrades(trades: Trade[]): Trade[] {
  const now = new Date();
  return trades.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
}

export function getYearTrades(trades: Trade[]): Trade[] {
  const now = new Date();
  return trades.filter(t => new Date(t.date).getFullYear() === now.getFullYear());
}

export function getEquityCurve(trades: Trade[]): { date: string; equity: number }[] {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  let cumulative = 0;
  const points: { date: string; equity: number }[] = [];
  for (const t of sorted) {
    cumulative += t.pnl;
    points.push({ date: t.date, equity: parseFloat(cumulative.toFixed(2)) });
  }
  return points;
}

export function getPnLBySetup(trades: Trade[]): { setup: string; pnl: number; count: number; winRate: number }[] {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const s = t.setup || 'Sin setup';
    if (!map.has(s)) map.set(s, []);
    map.get(s)!.push(t);
  }
  return Array.from(map.entries()).map(([setup, ts]) => ({
    setup,
    pnl: getTotalPnL(ts),
    count: ts.length,
    winRate: getWinRate(ts),
  }));
}

export function getPnLByAsset(trades: Trade[]): { asset: string; pnl: number; count: number }[] {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    if (!map.has(t.asset)) map.set(t.asset, []);
    map.get(t.asset)!.push(t);
  }
  return Array.from(map.entries()).map(([asset, ts]) => ({
    asset,
    pnl: getTotalPnL(ts),
    count: ts.length,
  }));
}

export function getMaxConsecutiveWins(trades: Trade[]): number {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  let max = 0, current = 0;
  for (const t of sorted) {
    if (t.pnl > 0) { current++; max = Math.max(max, current); }
    else current = 0;
  }
  return max;
}

export function getMaxConsecutiveLosses(trades: Trade[]): number {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  let max = 0, current = 0;
  for (const t of sorted) {
    if (t.pnl < 0) { current++; max = Math.max(max, current); }
    else current = 0;
  }
  return max;
}

export function getPnLByDayOfWeek(trades: Trade[]): { day: string; pnl: number; count: number }[] {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const map = new Map<number, Trade[]>();
  for (let i = 0; i < 7; i++) map.set(i, []);
  for (const t of trades) {
    const d = new Date(t.date).getDay();
    map.get(d)!.push(t);
  }
  return Array.from(map.entries()).map(([i, ts]) => ({
    day: days[i],
    pnl: getTotalPnL(ts),
    count: ts.length,
  }));
}

export function getPnLBySession(trades: Trade[]): { session: string; pnl: number; winRate: number }[] {
  const sessions: Record<string, string> = {
    london: 'Londres',
    new_york: 'Nueva York',
    asia: 'Asia',
    premarket: 'Pre-mercado',
  };
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    if (!map.has(t.session)) map.set(t.session, []);
    map.get(t.session)!.push(t);
  }
  return Array.from(map.entries()).map(([s, ts]) => ({
    session: sessions[s] || s,
    pnl: getTotalPnL(ts),
    winRate: getWinRate(ts),
  }));
}

export function formatCurrency(value: number, symbol = '$'): string {
  const abs = Math.abs(value);
  const formatted = abs >= 1000
    ? `${(abs / 1000).toFixed(1)}k`
    : abs.toFixed(2);
  return `${value < 0 ? '-' : ''}${symbol}${formatted}`;
}

export function getDailyPnL(trades: Trade[]): number {
  return getTotalPnL(getTodayTrades(trades));
}

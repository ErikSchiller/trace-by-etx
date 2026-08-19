import { getUserTrades, getCumulativePnL } from '../store/tradeStore';
import { usePropFirmStore, getPassRate } from '../store/propFirmStore';
import { useAuthStore } from '../store/authStore';
import { celebrate, markMilestone } from './celebrate';
import { playSound } from './sounds';

function monthPrefix(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function startOfWeekKey(d = new Date()) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}

/**
 * Checks cumulative trade milestones and fires one-time celebrations.
 * Call after a trade is added.
 */
export function checkTradeMilestones() {
  const trades = getUserTrades();
  const count = trades.length;
  if (count === 0) return;

  if (count >= 1 && markMilestone('first_trade')) celebrate('subtle');
  if (count >= 100 && markMilestone('trades_100')) { celebrate('huge'); playSound('success'); }

  const total = getCumulativePnL(trades);
  for (const threshold of [1000, 5000, 10000]) {
    if (total >= threshold && markMilestone(`profit_${threshold}`)) { celebrate('huge'); playSound('success'); }
  }

  const mp = monthPrefix();
  const monthNet = trades.filter(t => t.date.startsWith(mp)).reduce((s, t) => s + t.pnl, 0);
  if (monthNet > 0 && markMilestone('profitable_month')) celebrate('normal');

  const wk = startOfWeekKey();
  const weekNet = trades.filter(t => t.date >= wk).reduce((s, t) => s + t.pnl, 0);
  if (weekNet > 0 && markMilestone('profitable_week')) celebrate('normal');

  // 1-year anniversary on the app
  const createdAt = useAuthStore.getState().user?.createdAt;
  if (createdAt) {
    const days = (Date.now() - new Date(createdAt).getTime()) / 86400000;
    if (days >= 365 && markMilestone('anniversary_1yr')) celebrate('huge');
  }
}

/** First note ever created — subtle celebration. */
export function checkFirstNoteMilestone(noteCount: number) {
  if (noteCount >= 1 && markMilestone('first_note')) celebrate('subtle');
}

/** Daily routine 100% complete — subtle celebration (once per day). */
export function celebrateRoutineComplete(dateKey: string) {
  if (markMilestone(`routine_${dateKey}`)) { celebrate('subtle'); playSound('positive'); }
}

/** Passing a prop firm eval (marking funded) — always a big moment. */
export function celebrateEvalPassed() {
  celebrate('huge');
  playSound('success');
  checkAccountPassRate();
}

/** Prop firm pass rate crossing above 50% — one-time normal celebration. */
export function checkAccountPassRate() {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;
  const accounts = usePropFirmStore.getState().accounts.filter(a => a.userId === userId);
  const pass = getPassRate(accounts);
  if (pass.total >= 2 && pass.rate > 50 && markMilestone('passrate_50')) celebrate('normal');
}

/**
 * Fires a one-time celebration for a streak milestone of a given streak type.
 * Returns the milestone label hit (or null), so the caller can also toast.
 */
export function celebrateStreakMilestone(streakKey: string, current: number): number | null {
  const rungs = [7, 14, 30];
  let hit: number | null = null;
  for (const r of rungs) {
    if (current >= r && markMilestone(`streak_${streakKey}_${r}`)) hit = r;
  }
  if (hit) { celebrate('normal'); playSound('success'); }
  return hit;
}

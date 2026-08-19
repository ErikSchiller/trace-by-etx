import type { Trade } from '../store/tradeStore';
import type { Routine } from '../store/routineStore';
import type { Note } from '../store/notebookStore';

export type StreakKey = 'routine' | 'profitable' | 'noBlowup' | 'disciplined' | 'journal';

export interface StreakInfo {
  key: StreakKey;
  current: number;
  best: number;
  bestDate: string | null;
  last7: boolean[]; // oldest → newest, true = qualifying day
}

export const STREAK_META: { key: StreakKey; icon: string; name: string }[] = [
  { key: 'routine', icon: '🔥', name: 'Rutina completa' },
  { key: 'profitable', icon: '📈', name: 'Días profitable' },
  { key: 'noBlowup', icon: '🛡', name: 'Sin blowup' },
  { key: 'disciplined', icon: '🎯', name: 'Disciplina' },
  { key: 'journal', icon: '✍️', name: 'Journal diario' },
];

function iso(d: Date) { return d.toISOString().slice(0, 10); }
function todayKey() { return iso(new Date()); }
function addDays(key: string, n: number) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + n);
  return iso(d);
}
function last7Keys(): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 6; i >= 0; i--) { const x = new Date(d); x.setDate(d.getDate() - i); out.push(iso(x)); }
  return out;
}

/** Streak over calendar days: today counts as grace (not yet broken) if not qualifying. */
function calendarStreak(qualifies: Set<string>): { current: number; best: number; bestDate: string | null } {
  const today = todayKey();
  let current = 0;
  const d = new Date();
  for (;;) {
    const key = iso(d);
    if (qualifies.has(key)) { current += 1; d.setDate(d.getDate() - 1); }
    else if (key === today) { d.setDate(d.getDate() - 1); }
    else break;
  }
  // best run across all qualifying dates
  const sorted = [...qualifies].sort();
  let best = 0, run = 0, bestDate: string | null = null;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] === addDays(sorted[i - 1], 1)) run += 1;
    else run = 1;
    if (run > best) { best = run; bestDate = sorted[i]; }
  }
  return { current, best: Math.max(best, current), bestDate };
}

/** Streak over trading days only (non-trading days are skipped, not breaks). */
function tradingStreak(tradingDaysAsc: string[], qualifies: Set<string>): { current: number; best: number; bestDate: string | null } {
  let current = 0;
  for (let i = tradingDaysAsc.length - 1; i >= 0; i--) {
    if (qualifies.has(tradingDaysAsc[i])) current += 1;
    else break;
  }
  let best = 0, run = 0, bestDate: string | null = null;
  for (const day of tradingDaysAsc) {
    if (qualifies.has(day)) { run += 1; if (run > best) { best = run; bestDate = day; } }
    else run = 0;
  }
  return { current, best: Math.max(best, current), bestDate };
}

function last7For(qualifies: Set<string>): boolean[] {
  return last7Keys().map(k => qualifies.has(k));
}

export interface StreakInputs {
  routine: Routine | null;
  completions: Record<string, string[]>;
  trades: Trade[];
  notes: Note[];
  dailyLossLimit: number;
}

/* ============ Event detection (milestones / records / breaks) ============ */

const SNAP_KEY = 'trace_streak_state';
type Snapshot = Record<string, { current: number; best: number }>;

export interface StreakEvent {
  key: StreakKey;
  kind: 'milestone' | 'record' | 'broken';
  value: number;
  message: string;
}

const RUNG_MESSAGE: Record<number, string> = {
  3: 'Racha de 3 días 🔥',
  7: '¡Una semana completa!',
  14: 'Dos semanas seguidas',
  30: 'Un mes entero. Increíble.',
};

/**
 * Compares current streaks against the last saved snapshot and returns
 * transition events (rung reached, record beaten, streak broken). Persists the
 * new snapshot. On the very first run (no snapshot) it seeds silently.
 */
export function detectStreakEvents(streaks: Record<StreakKey, StreakInfo>): StreakEvent[] {
  let snap: Snapshot | null = null;
  try { const raw = localStorage.getItem(SNAP_KEY); if (raw) snap = JSON.parse(raw); } catch { /* ignore */ }

  const next: Snapshot = {};
  for (const k of Object.keys(streaks) as StreakKey[]) {
    next[k] = { current: streaks[k].current, best: streaks[k].best };
  }

  if (!snap) {
    try { localStorage.setItem(SNAP_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return [];
  }

  const events: StreakEvent[] = [];
  for (const k of Object.keys(streaks) as StreakKey[]) {
    const prev = snap[k] ?? { current: 0, best: 0 };
    const cur = streaks[k].current;
    let crossedRung = false;
    if (cur > prev.current) {
      for (const rung of [3, 7, 14, 30]) {
        if (prev.current < rung && cur >= rung) { events.push({ key: k, kind: 'milestone', value: rung, message: RUNG_MESSAGE[rung] }); crossedRung = true; }
      }
    }
    if (!crossedRung && cur > prev.best && cur >= 3) {
      events.push({ key: k, kind: 'record', value: cur, message: `¡Nuevo récord! ${cur} días` });
    }
    if (prev.current >= 3 && cur === 0) {
      events.push({ key: k, kind: 'broken', value: 0, message: 'Racha rota. Empieza otra mañana.' });
    }
  }

  try { localStorage.setItem(SNAP_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return events;
}

export function computeStreaks({ routine, completions, trades, notes, dailyLossLimit }: StreakInputs): Record<StreakKey, StreakInfo> {
  // Routine — days at 100% completion
  const routineDays = new Set<string>();
  if (routine && routine.habits.length > 0) {
    const ids = new Set(routine.habits.map(h => h.id));
    const need = routine.habits.length;
    for (const [date, list] of Object.entries(completions)) {
      if (list.filter(id => ids.has(id)).length >= need) routineDays.add(date);
    }
  }

  // Per-day aggregates over trades
  const byDay = new Map<string, { pnl: number; hasError: boolean }>();
  for (const t of trades) {
    const cur = byDay.get(t.date) ?? { pnl: 0, hasError: false };
    cur.pnl += t.pnl;
    if (t.errorTags && t.errorTags.length > 0) cur.hasError = true;
    byDay.set(t.date, cur);
  }
  const tradingDaysAsc = [...byDay.keys()].sort();
  const profitableDays = new Set<string>();
  const noBlowupDays = new Set<string>();
  const disciplinedDays = new Set<string>();
  for (const [date, agg] of byDay) {
    if (agg.pnl > 0) profitableDays.add(date);
    if (agg.pnl > -dailyLossLimit) noBlowupDays.add(date);
    if (!agg.hasError) disciplinedDays.add(date);
  }

  // Journal — days with a day-note
  const journalDays = new Set<string>();
  for (const n of notes) { if (n.noteDate) journalDays.add(n.noteDate); }

  const routineS = calendarStreak(routineDays);
  const journalS = calendarStreak(journalDays);
  const profitableS = tradingStreak(tradingDaysAsc, profitableDays);
  const noBlowupS = tradingStreak(tradingDaysAsc, noBlowupDays);
  const disciplinedS = tradingStreak(tradingDaysAsc, disciplinedDays);

  return {
    routine: { key: 'routine', ...routineS, last7: last7For(routineDays) },
    profitable: { key: 'profitable', ...profitableS, last7: last7For(profitableDays) },
    noBlowup: { key: 'noBlowup', ...noBlowupS, last7: last7For(noBlowupDays) },
    disciplined: { key: 'disciplined', ...disciplinedS, last7: last7For(disciplinedDays) },
    journal: { key: 'journal', ...journalS, last7: last7For(journalDays) },
  };
}

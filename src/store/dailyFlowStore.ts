import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

/* ────────────────────────────────────────────────────────────────────────
 * Daily Flow — 4-step daily ritual (pre-market → discipline → trade recap →
 * day wrap). Days are keyed by the user's LOCAL date (YYYY-MM-DD), so a wrap
 * signed at 23:55 lands on "today", not on tomorrow in UTC.
 * ──────────────────────────────────────────────────────────────────────── */

export type StepId = 'pre_market' | 'discipline' | 'trade_recap' | 'day_wrap';
export const STEP_ORDER: StepId[] = ['pre_market', 'discipline', 'trade_recap', 'day_wrap'];
export const STEP_NAME: Record<StepId, string> = {
  pre_market: 'Pre-market Setup', discipline: 'Discipline', trade_recap: 'Trade Recap', day_wrap: 'Day Wrap',
};

export type Mood = 1 | 2 | 3 | 4 | 5;
export interface TemplateItem { id: string; label: string }
export interface ChecklistItem extends TemplateItem { checked: boolean }

export interface PreMarketData {
  mood: Mood;
  moodLabel: string;
  checklist: ChecklistItem[];
  notes?: string;
  completedAt: string;
  skipped?: boolean;
}

export interface DisciplineTask { id: string; label: string; done: boolean; doneAt?: string }
export interface DisciplineData { tasks: DisciplineTask[]; completedAt?: string }

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export interface TradeRecapEntry { tradeId: string; grade: Grade; rulesFollowed: boolean; notes?: string; gradedAt: string }
export interface TradeRecapData { entries: TradeRecapEntry[]; completedAt?: string }

export interface DayWrapData { reflection: string; tomorrowFocus?: string; energyLevel: Mood; signedAt: string }

export interface DailyFlowDay {
  date: string;
  preMarket?: PreMarketData;
  discipline?: DisciplineData;
  tradeRecap?: TradeRecapData;
  dayWrap?: DayWrapData;
}

export interface StreakInfo { current: number; best: number; bestDate?: string; lastActiveDate?: string }

/** Local-time YYYY-MM-DD (never UTC). */
export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return localDateKey(new Date(y, m - 1, d + days));
}

const DEFAULT_CHECKLIST: TemplateItem[] = [
  'Revisé el economic calendar',
  'Marqué mis niveles clave',
  'Definí mi plan A y plan B',
  'Estado emocional: OK para operar',
  'Riesgo diario definido',
].map(label => ({ id: nanoid(), label }));

const DEFAULT_DISCIPLINE: TemplateItem[] = [
  'Solo setups A+',
  'Respeto el daily loss limit',
  'No reviso PnL durante los trades',
  'Pausa de 10 min después de un loss',
].map(label => ({ id: nanoid(), label }));

/* ── Step-state helpers (pure, reusable by pages/widgets) ─────────────── */
export function stepComplete(day: DailyFlowDay | undefined, step: StepId): boolean {
  if (!day) return false;
  switch (step) {
    case 'pre_market': return !!day.preMarket && !day.preMarket.skipped;
    case 'discipline': return !!day.discipline?.completedAt;
    case 'trade_recap': return !!day.tradeRecap?.completedAt;
    case 'day_wrap': return !!day.dayWrap?.signedAt;
  }
}
export function stepSkipped(day: DailyFlowDay | undefined, step: StepId): boolean {
  return step === 'pre_market' && !!day?.preMarket?.skipped;
}
/** Done or deliberately skipped — the flow can move past it. */
export function stepHandled(day: DailyFlowDay | undefined, step: StepId): boolean {
  return stepComplete(day, step) || stepSkipped(day, step);
}

/** Journalling: the day's wrap was signed. */
export function dayJournalled(day: DailyFlowDay | undefined): boolean {
  return !!day?.dayWrap?.signedAt;
}
/** Discipline: rules existed for the day and every one was kept. */
export function dayDisciplined(day: DailyFlowDay | undefined): boolean {
  const tasks = day?.discipline?.tasks ?? [];
  return tasks.length > 0 && tasks.every(t => t.done);
}

/**
 * Walk backwards from today. Today still "in progress" doesn't break the run:
 * if today doesn't qualify yet, counting starts from yesterday.
 */
export function computeStreak(days: Record<string, DailyFlowDay>, qualifies: (d: DailyFlowDay | undefined) => boolean, today = localDateKey()): StreakInfo {
  let start = today;
  if (!qualifies(days[today])) start = shiftDateKey(today, -1);
  let current = 0;
  let cursor = start;
  while (qualifies(days[cursor])) { current++; cursor = shiftDateKey(cursor, -1); }

  // Best run across all recorded days.
  const keys = Object.keys(days).filter(k => qualifies(days[k])).sort();
  let best = 0, run = 0, bestDate: string | undefined, prev: string | undefined;
  for (const k of keys) {
    run = prev && shiftDateKey(prev, 1) === k ? run + 1 : 1;
    if (run > best) { best = run; bestDate = k; }
    prev = k;
  }
  return { current, best: Math.max(best, current), bestDate, lastActiveDate: keys[keys.length - 1] };
}

interface DailyFlowState {
  days: Record<string, DailyFlowDay>;
  defaultChecklist: TemplateItem[];
  defaultDisciplineTasks: TemplateItem[];

  getToday: () => DailyFlowDay;
  getDay: (date: string) => DailyFlowDay | undefined;
  isStepComplete: (date: string, step: StepId) => boolean;
  getCompletedStepCount: (date: string) => number;
  getNextRecommendedStep: (date: string) => StepId | null;
  isDayFullyComplete: (date: string) => boolean;
  getJournallingStreak: () => StreakInfo;
  getDisciplineStreak: () => StreakInfo;

  savePreMarket: (date: string, data: PreMarketData) => void;
  skipPreMarket: (date: string) => void;
  saveDiscipline: (date: string, tasks: DisciplineTask[], completed: boolean) => void;
  gradeTrade: (date: string, entry: TradeRecapEntry) => void;
  completeTradeRecap: (date: string) => void;
  saveDayWrap: (date: string, data: DayWrapData) => void;

  updateDefaultChecklist: (items: TemplateItem[]) => void;
  updateDefaultDisciplineTasks: (items: TemplateItem[]) => void;
}

export const useDailyFlowStore = create<DailyFlowState>()(
  persist(
    (set, get) => {
      const patchDay = (date: string, patch: Partial<DailyFlowDay>) =>
        set(s => ({ days: { ...s.days, [date]: { ...(s.days[date] ?? { date }), ...patch, date } } }));

      return {
        days: {},
        defaultChecklist: DEFAULT_CHECKLIST,
        defaultDisciplineTasks: DEFAULT_DISCIPLINE,

        getToday: () => { const k = localDateKey(); return get().days[k] ?? { date: k }; },
        getDay: (date) => get().days[date],
        isStepComplete: (date, step) => stepComplete(get().days[date], step),
        getCompletedStepCount: (date) => STEP_ORDER.filter(s => stepComplete(get().days[date], s)).length,
        getNextRecommendedStep: (date) => STEP_ORDER.find(s => !stepHandled(get().days[date], s)) ?? null,
        // Every step handled (a skipped pre-market still lets the day close) and the wrap signed.
        isDayFullyComplete: (date) => STEP_ORDER.every(s => stepHandled(get().days[date], s)),
        getJournallingStreak: () => computeStreak(get().days, dayJournalled),
        getDisciplineStreak: () => computeStreak(get().days, dayDisciplined),

        savePreMarket: (date, data) => patchDay(date, { preMarket: { ...data, skipped: false } }),
        skipPreMarket: (date) => patchDay(date, {
          preMarket: { mood: 3, moodLabel: 'Neutral', checklist: [], completedAt: new Date().toISOString(), skipped: true },
        }),
        saveDiscipline: (date, tasks, completed) => {
          const prev = get().days[date]?.discipline;
          // Reopening a finalized day to tick more boxes keeps it finalized.
          patchDay(date, { discipline: { tasks, completedAt: completed ? new Date().toISOString() : prev?.completedAt } });
        },
        gradeTrade: (date, entry) => {
          const prev = get().days[date]?.tradeRecap;
          const entries = [...(prev?.entries ?? []).filter(e => e.tradeId !== entry.tradeId), entry];
          patchDay(date, { tradeRecap: { entries, completedAt: prev?.completedAt } });
        },
        completeTradeRecap: (date) => {
          const prev = get().days[date]?.tradeRecap;
          patchDay(date, { tradeRecap: { entries: prev?.entries ?? [], completedAt: new Date().toISOString() } });
        },
        saveDayWrap: (date, data) => patchDay(date, { dayWrap: data }),

        updateDefaultChecklist: (items) => set({ defaultChecklist: items }),
        updateDefaultDisciplineTasks: (items) => set({ defaultDisciplineTasks: items }),
      };
    },
    {
      name: 'trace_daily_flow',
      version: 1,
      // Only data is persisted; selectors/actions come from the initializer.
      partialize: (s) => ({ days: s.days, defaultChecklist: s.defaultChecklist, defaultDisciplineTasks: s.defaultDisciplineTasks }),
    }
  )
);

/** Reactive hook for one day (re-renders when that day's data changes). */
export function useDailyFlowDay(date: string): DailyFlowDay {
  const day = useDailyFlowStore(s => s.days[date]);
  return day ?? { date };
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { useAuthStore } from './authStore';
import { useUndoStore } from './undoStore';

/* ────────────────────────────────────────────────────────────────────────
 * Manual calendar events (notebook upgrade, Phase 6). Automatic sources
 * (trades, routines, payouts, resets, goal deadlines, dated notes) are derived
 * in the Calendar view from their own stores — only manual events live here.
 * ──────────────────────────────────────────────────────────────────────── */

export type EventCategory = 'personal' | 'trading' | 'content' | 'other' | 'custom';
export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  date: string;          // ISO yyyy-mm-dd (first/base occurrence)
  startTime?: string;    // "09:30"
  endTime?: string;
  category: EventCategory;
  color?: string;
  description?: string;
  linkedNoteId?: string;
  repeat?: RepeatRule;
  repeatUntil?: string;  // ISO yyyy-mm-dd
  createdAt: string;
  updatedAt: string;
}

export type NewEventInput = Partial<Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> & { title: string; date: string };

interface CalendarStore {
  events: CalendarEvent[];
  addEvent: (input: NewEventInput) => CalendarEvent;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  clearAll: () => void;
}

export const EVENT_CATEGORY_COLOR: Record<EventCategory, string> = {
  personal: '#8b5cf6', trading: '#4f8fff', content: '#f59e0b', other: '#6b7382', custom: '#22c55e',
};

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      events: [],

      addEvent: (input) => {
        const userId = useAuthStore.getState().user?.id ?? 'anonymous';
        const now = new Date().toISOString();
        const ev: CalendarEvent = {
          id: nanoid(), userId,
          title: input.title, date: input.date,
          startTime: input.startTime, endTime: input.endTime,
          category: input.category ?? 'personal',
          color: input.color ?? EVENT_CATEGORY_COLOR[input.category ?? 'personal'],
          description: input.description,
          linkedNoteId: input.linkedNoteId,
          repeat: input.repeat ?? 'none',
          repeatUntil: input.repeatUntil,
          createdAt: now, updatedAt: now,
        };
        set(s => ({ events: [...s.events, ev] }));
        return ev;
      },

      updateEvent: (id, updates) => {
        set(s => ({ events: s.events.map(e => e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e) }));
      },

      deleteEvent: (id) => {
        const ev = get().events.find(e => e.id === id);
        set(s => ({ events: s.events.filter(e => e.id !== id) }));
        if (ev) {
          useUndoStore.getState().register({
            message: 'Evento eliminado',
            execute: () => set(s => (s.events.some(e => e.id === ev.id) ? s : { events: [...s.events, ev] })),
          });
        }
      },

      clearAll: () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        set(s => ({ events: s.events.filter(e => e.userId !== userId) }));
      },
    }),
    { name: 'trace_calendar', version: 1 }
  )
);

/* ── Selectors / recurrence expansion ──────────────────────────────────── */

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** An event occurrence resolved to a concrete date (recurrence expanded). */
export interface EventOccurrence extends CalendarEvent { occurrenceDate: string }

/**
 * Expand an event's recurrence into concrete occurrences within [from, to]
 * (inclusive, ISO yyyy-mm-dd). Caps the expansion to avoid runaway loops.
 */
export function expandEvent(ev: CalendarEvent, from: string, to: string): EventOccurrence[] {
  const out: EventOccurrence[] = [];
  const rule = ev.repeat ?? 'none';
  const hardEnd = ev.repeatUntil && ev.repeatUntil < to ? ev.repeatUntil : to;
  if (rule === 'none') {
    if (ev.date >= from && ev.date <= to) out.push({ ...ev, occurrenceDate: ev.date });
    return out;
  }
  let cursor = ev.date;
  for (let i = 0; i < 1000 && cursor <= hardEnd; i++) {
    if (cursor >= from) out.push({ ...ev, occurrenceDate: cursor });
    if (rule === 'daily') cursor = addDaysISO(cursor, 1);
    else if (rule === 'weekly') cursor = addDaysISO(cursor, 7);
    else { // monthly — same day-of-month
      const d = new Date(cursor + 'T00:00:00');
      d.setMonth(d.getMonth() + 1);
      cursor = d.toISOString().slice(0, 10);
    }
  }
  return out;
}

/** All manual event occurrences for the current user within [from, to]. */
export function useEventsInRange(from: string, to: string): EventOccurrence[] {
  const userId = useAuthStore(s => s.user?.id);
  const events = useCalendarStore(s => s.events);
  if (!userId) return [];
  return events
    .filter(e => e.userId === userId)
    .flatMap(e => expandEvent(e, from, to))
    .sort((a, b) => (a.occurrenceDate + (a.startTime ?? '')).localeCompare(b.occurrenceDate + (b.startTime ?? '')));
}

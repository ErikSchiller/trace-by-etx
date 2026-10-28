import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { useAuthStore } from './authStore';
import { useUndoStore } from './undoStore';

/* ────────────────────────────────────────────────────────────────────────
 * Goals — first-class entity (notebook upgrade, Phase 5).
 * Notes link to goals via Note.linkedGoalIds; goals link back via linkedNoteIds.
 * ──────────────────────────────────────────────────────────────────────── */

export type GoalCategory = 'trading' | 'personal' | 'health' | 'financial' | 'other';
export type GoalType = 'milestone' | 'metric' | 'habit';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';

export interface GoalMilestone {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: GoalCategory;
  type: GoalType;
  // metric type
  target?: number;
  current?: number;
  unit?: string;            // "$", "trades", "días", "%"
  deadline?: string;        // ISO
  status: GoalStatus;
  completedAt?: string;
  milestones?: GoalMilestone[];
  color?: string;
  icon?: string;            // lucide icon name
  linkedNoteIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export type NewGoalInput = Partial<Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> & { title: string };

interface GoalsStore {
  goals: Goal[];
  addGoal: (input: NewGoalInput) => Goal;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  setCurrent: (goalId: string, current: number) => void;
  linkNote: (goalId: string, noteId: string) => void;
  unlinkNote: (goalId: string, noteId: string) => void;
  seedTemplatesIfEmpty: () => void;
  clearAll: () => void;
}

/** Progress 0–1 for any goal type. */
export function goalProgress(g: Goal): number {
  if (g.status === 'completed') return 1;
  if (g.type === 'metric' && g.target && g.target > 0) {
    return Math.max(0, Math.min(1, (g.current ?? 0) / g.target));
  }
  if (g.milestones && g.milestones.length) {
    return g.milestones.filter(m => m.completed).length / g.milestones.length;
  }
  return g.status === 'active' ? 0 : 0;
}

export const GOAL_CATEGORY_COLOR: Record<GoalCategory, string> = {
  trading: '#4f8fff', financial: '#22c55e', health: '#f59e0b', personal: '#8b5cf6', other: '#6b7382',
};

/** Pre-built goal templates (seeded once per user). */
const GOAL_TEMPLATES: NewGoalInput[] = [
  { title: 'Generar €10K con trading', category: 'financial', type: 'metric', target: 10000, current: 0, unit: '€', icon: 'DollarSign', color: '#22c55e' },
  { title: 'Lanzar nueva versión de TRACE', category: 'personal', type: 'milestone', icon: 'Rocket', color: '#4f8fff',
    milestones: [
      { id: nanoid(), label: 'Consolidar estrategia', completed: false },
      { id: nanoid(), label: 'Crear 10 piezas de contenido', completed: false },
      { id: nanoid(), label: 'Lanzar beta', completed: false },
    ] },
  { title: 'Mejorar condición física', category: 'health', type: 'habit', target: 100, current: 60, unit: '%', icon: 'Dumbbell', color: '#f59e0b' },
  { title: 'Leer 5 libros', category: 'personal', type: 'metric', target: 5, current: 1, unit: 'libros', icon: 'BookOpen', color: '#8b5cf6' },
];

export const useGoalsStore = create<GoalsStore>()(
  persist(
    (set, get) => ({
      goals: [],

      addGoal: (input) => {
        const userId = useAuthStore.getState().user?.id ?? 'anonymous';
        const now = new Date().toISOString();
        const goal: Goal = {
          id: nanoid(),
          userId,
          title: input.title,
          description: input.description,
          category: input.category ?? 'other',
          type: input.type ?? 'milestone',
          target: input.target,
          current: input.current ?? (input.type === 'metric' ? 0 : undefined),
          unit: input.unit,
          deadline: input.deadline,
          status: input.status ?? 'active',
          completedAt: input.completedAt,
          milestones: input.milestones,
          color: input.color ?? (input.category ? GOAL_CATEGORY_COLOR[input.category] : undefined),
          icon: input.icon,
          linkedNoteIds: input.linkedNoteIds ?? [],
          createdAt: now,
          updatedAt: now,
        };
        set(s => ({ goals: [...s.goals, goal] }));
        return goal;
      },

      updateGoal: (id, updates) => {
        set(s => ({
          goals: s.goals.map(g => {
            if (g.id !== id) return g;
            const merged: Goal = { ...g, ...updates, updatedAt: new Date().toISOString() };
            // Auto complete/reopen based on status transitions.
            if (updates.status === 'completed' && !merged.completedAt) merged.completedAt = new Date().toISOString();
            if (updates.status && updates.status !== 'completed') merged.completedAt = undefined;
            return merged;
          }),
        }));
      },

      deleteGoal: (id) => {
        const goal = get().goals.find(g => g.id === id);
        set(s => ({ goals: s.goals.filter(g => g.id !== id) }));
        if (goal) {
          useUndoStore.getState().register({
            message: 'Meta eliminada',
            execute: () => set(s => (s.goals.some(g => g.id === goal.id) ? s : { goals: [...s.goals, goal] })),
          });
        }
      },

      toggleMilestone: (goalId, milestoneId) => {
        set(s => ({
          goals: s.goals.map(g => {
            if (g.id !== goalId || !g.milestones) return g;
            const milestones = g.milestones.map(m => m.id === milestoneId
              ? { ...m, completed: !m.completed, completedAt: !m.completed ? new Date().toISOString() : undefined }
              : m);
            return { ...g, milestones, updatedAt: new Date().toISOString() };
          }),
        }));
      },

      setCurrent: (goalId, current) => {
        set(s => ({ goals: s.goals.map(g => g.id === goalId ? { ...g, current, updatedAt: new Date().toISOString() } : g) }));
      },

      linkNote: (goalId, noteId) => {
        set(s => ({ goals: s.goals.map(g => g.id === goalId ? { ...g, linkedNoteIds: Array.from(new Set([...(g.linkedNoteIds ?? []), noteId])), updatedAt: new Date().toISOString() } : g) }));
      },

      unlinkNote: (goalId, noteId) => {
        set(s => ({ goals: s.goals.map(g => g.id === goalId ? { ...g, linkedNoteIds: (g.linkedNoteIds ?? []).filter(n => n !== noteId) } : g) }));
      },

      seedTemplatesIfEmpty: () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        if (get().goals.some(g => g.userId === userId)) return;
        GOAL_TEMPLATES.forEach(t => get().addGoal(t));
      },

      clearAll: () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        set(s => ({ goals: s.goals.filter(g => g.userId !== userId) }));
      },
    }),
    { name: 'trace_goals', version: 1 }
  )
);

export function useUserGoals() {
  const userId = useAuthStore(s => s.user?.id);
  const goals = useGoalsStore(s => s.goals);
  if (!userId) return [];
  return goals.filter(g => g.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

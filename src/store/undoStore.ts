import { create } from 'zustand';
import { nanoid } from 'nanoid';

export interface UndoAction {
  id: string;
  message: string;      // e.g. "Operación eliminada"
  timestamp: number;
  execute: () => void;  // restores the deleted entity
}

const EXPIRY_MS = 6000;

interface UndoStore {
  actions: UndoAction[];
  register: (action: Pick<UndoAction, 'message' | 'execute'>) => void;
  undoLast: () => UndoAction | null;
  remove: (id: string) => void;
  clear: () => void;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const useUndoStore = create<UndoStore>((set, get) => ({
  actions: [],

  register: ({ message, execute }) => {
    const id = nanoid();
    const action: UndoAction = { id, message, execute, timestamp: Date.now() };
    set(s => ({ actions: [...s.actions, action] }));
    timers.set(id, setTimeout(() => get().remove(id), EXPIRY_MS));
  },

  undoLast: () => {
    const { actions } = get();
    const last = actions[actions.length - 1];
    if (!last) return null;
    const timer = timers.get(last.id);
    if (timer) { clearTimeout(timer); timers.delete(last.id); }
    set(s => ({ actions: s.actions.filter(a => a.id !== last.id) }));
    last.execute();
    return last;
  },

  remove: (id) => {
    const timer = timers.get(id);
    if (timer) { clearTimeout(timer); timers.delete(id); }
    set(s => ({ actions: s.actions.filter(a => a.id !== id) }));
  },

  clear: () => {
    timers.forEach(t => clearTimeout(t));
    timers.clear();
    set({ actions: [] });
  },
}));

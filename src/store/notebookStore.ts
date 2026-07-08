import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { useAuthStore } from './authStore';

export interface Note {
  id: string;
  userId: string;
  folderId: string;
  title: string;
  content: string;
  date: string;
  tags: string[];
  linkedTradeDate?: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  userId: string;
  name: string;
  icon: string;
  order: number;
}

interface NotebookStore {
  folders: Folder[];
  notes: Note[];
  ensureDefaultFolders: () => void;
  addFolder: (name: string, icon: string) => Folder;
  deleteFolder: (id: string) => void;
  addNote: (folderId: string, title?: string, content?: string, linkedTradeDate?: string) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  clearAll: () => void;
}

const DEFAULT_FOLDERS = [
  { name: 'Trade Notes',     icon: '📝' },
  { name: 'Diario Diario',   icon: '📓' },
  { name: 'Sessions Recap',  icon: '📊' },
  { name: 'Estrategias',     icon: '⚙' },
  { name: 'Psicología',      icon: '🧠' },
  { name: 'Mis notas',       icon: '📌' },
];

export const useNotebookStore = create<NotebookStore>()(
  persist(
    (set, get) => ({
      folders: [],
      notes: [],

      ensureDefaultFolders: () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        const existing = get().folders.filter(f => f.userId === userId);
        if (existing.length > 0) return;
        const created: Folder[] = DEFAULT_FOLDERS.map((f, i) => ({
          id: nanoid(),
          userId,
          name: f.name,
          icon: f.icon,
          order: i,
        }));
        set(s => ({ folders: [...s.folders, ...created] }));
      },

      addFolder: (name, icon) => {
        const userId = useAuthStore.getState().user?.id ?? 'anonymous';
        const folder: Folder = {
          id: nanoid(),
          userId,
          name,
          icon,
          order: get().folders.length,
        };
        set(s => ({ folders: [...s.folders, folder] }));
        return folder;
      },

      deleteFolder: (id) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        const fallback = get().folders.find(f => f.userId === userId && f.name === 'Mis notas');
        set(s => ({
          folders: s.folders.filter(f => f.id !== id),
          notes: s.notes.map(n => n.folderId === id && fallback ? { ...n, folderId: fallback.id } : n),
        }));
      },

      addNote: (folderId, title = 'Sin título', content = '', linkedTradeDate) => {
        const userId = useAuthStore.getState().user?.id ?? 'anonymous';
        const now = new Date().toISOString();
        const note: Note = {
          id: nanoid(),
          userId,
          folderId,
          title,
          content,
          date: now.slice(0, 10),
          tags: [],
          linkedTradeDate,
          images: [],
          createdAt: now,
          updatedAt: now,
        };
        set(s => ({ notes: [...s.notes, note] }));
        return note;
      },

      updateNote: (id, updates) => {
        set(s => ({
          notes: s.notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n),
        }));
      },

      deleteNote: (id) => set(s => ({ notes: s.notes.filter(n => n.id !== id) })),

      clearAll: () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        set(s => ({
          notes: s.notes.filter(n => n.userId !== userId),
          folders: s.folders.filter(f => f.userId !== userId),
        }));
      },
    }),
    { name: 'trace_notebook' }
  )
);

export function useUserFolders() {
  const userId = useAuthStore(s => s.user?.id);
  const folders = useNotebookStore(s => s.folders);
  if (!userId) return [];
  return folders.filter(f => f.userId === userId).sort((a, b) => a.order - b.order);
}

export function useUserNotes() {
  const userId = useAuthStore(s => s.user?.id);
  const notes = useNotebookStore(s => s.notes);
  if (!userId) return [];
  return notes
    .filter(n => n.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

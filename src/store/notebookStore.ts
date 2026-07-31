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
  linkedTradeId?: string;
  noteDate?: string;
  favorite?: boolean;
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
  /** System folder (e.g. Diario Diario) — cannot be deleted. */
  system?: boolean;
  /** Seeded default folder — cannot be deleted. */
  isDefault?: boolean;
}

export const DIARIO_FOLDER_NAME = 'Diario Diario';

interface NotebookStore {
  folders: Folder[];
  notes: Note[];
  ensureDefaultFolders: () => void;
  ensureDiarioFolder: () => Folder;
  ensureTradeNotesFolder: () => Folder;
  addFolder: (name: string, icon: string) => Folder;
  updateFolder: (id: string, updates: Partial<Pick<Folder, 'name' | 'icon'>>) => void;
  reorderFolders: (orderedIds: string[]) => void;
  deleteFolder: (id: string) => void;
  addNote: (folderId: string, title?: string, content?: string, linkedTradeDate?: string) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  /** Create or update the auto-generated note linked to a trade. */
  upsertTradeNote: (tradeId: string, title: string, content: string) => void;
  deleteNotesByTrade: (tradeId: string) => void;
  clearAll: () => void;
}

export const DEFAULT_FOLDER_NAMES = ['Trade Notes', 'Sessions Recap', 'Estrategias', 'Psicología', 'Mis notas', DIARIO_FOLDER_NAME];

const DEFAULT_FOLDERS = [
  { name: 'Trade Notes',     icon: '📓' },
  { name: 'Sessions Recap',  icon: '📊' },
  { name: 'Estrategias',     icon: '🧠' },
  { name: 'Psicología',      icon: '🎯' },
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
          isDefault: true,
        }));
        set(s => ({ folders: [...s.folders, ...created] }));
      },

      ensureDiarioFolder: () => {
        const userId = useAuthStore.getState().user?.id ?? 'anonymous';
        const existing = get().folders.find(f => f.userId === userId && f.name === DIARIO_FOLDER_NAME);
        if (existing) return existing;
        const folder: Folder = { id: nanoid(), userId, name: DIARIO_FOLDER_NAME, icon: '📓', order: -1, system: true };
        set(s => ({ folders: [...s.folders, folder] }));
        return folder;
      },

      ensureTradeNotesFolder: () => {
        const userId = useAuthStore.getState().user?.id ?? 'anonymous';
        const existing = get().folders.find(f => f.userId === userId && f.name === 'Trade Notes');
        if (existing) return existing;
        const folder: Folder = { id: nanoid(), userId, name: 'Trade Notes', icon: '📓', order: 0, isDefault: true };
        set(s => ({ folders: [...s.folders, folder] }));
        return folder;
      },

      addFolder: (name, icon) => {
        const userId = useAuthStore.getState().user?.id ?? 'anonymous';
        const maxOrder = get().folders.filter(f => f.userId === userId).reduce((m, f) => Math.max(m, f.order), -1);
        const folder: Folder = {
          id: nanoid(),
          userId,
          name,
          icon,
          order: maxOrder + 1,
        };
        set(s => ({ folders: [...s.folders, folder] }));
        return folder;
      },

      updateFolder: (id, updates) => {
        set(s => ({ folders: s.folders.map(f => f.id === id ? { ...f, ...updates } : f) }));
      },

      reorderFolders: (orderedIds) => {
        const pos = new Map(orderedIds.map((id, i) => [id, i]));
        set(s => ({ folders: s.folders.map(f => pos.has(f.id) ? { ...f, order: pos.get(f.id)! } : f) }));
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

      upsertTradeNote: (tradeId, title, content) => {
        const userId = useAuthStore.getState().user?.id ?? 'anonymous';
        const existing = get().notes.find(n => n.userId === userId && n.linkedTradeId === tradeId);
        if (existing) {
          get().updateNote(existing.id, { title, content });
          return;
        }
        const folder = get().ensureTradeNotesFolder();
        const now = new Date().toISOString();
        const note: Note = {
          id: nanoid(), userId, folderId: folder.id, title, content,
          date: now.slice(0, 10), tags: ['auto-generado'], linkedTradeId: tradeId,
          images: [], createdAt: now, updatedAt: now,
        };
        set(s => ({ notes: [...s.notes, note] }));
      },

      deleteNotesByTrade: (tradeId) => set(s => ({ notes: s.notes.filter(n => n.linkedTradeId !== tradeId) })),

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

// Register the trade → note cascade handler (called by tradeStore on trade deletion,
// decoupled via window to avoid a cross-store import that breaks prod bundling).
if (typeof window !== 'undefined') {
  (window as unknown as { __traceNoteCascade?: (ids: string[]) => void }).__traceNoteCascade = (ids) => {
    const del = useNotebookStore.getState().deleteNotesByTrade;
    ids.forEach(del);
  };
}

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

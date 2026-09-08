import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { useAuthStore } from './authStore';
import { useUndoStore } from './undoStore';

/* ────────────────────────────────────────────────────────────────────────
 * Block-based note model (added in the notebook redesign).
 * Notes keep a legacy `content` string that is DERIVED from blocks on every
 * save (see deriveContentFromBlocks) so out-of-scope readers — CommandPalette,
 * PnLCardModal, WeeklyRecap, Progress, Journal, search — keep working unchanged.
 * ──────────────────────────────────────────────────────────────────────── */

export type BlockType =
  | 'heading' | 'paragraph' | 'callout' | 'checklist'
  | 'trade' | 'image' | 'divider' | 'code' | 'quote';

export interface ChecklistItem { id: string; text: string; checked: boolean }

export interface Block {
  id: string;
  type: BlockType;
  // Loose by design — shape depends on `type` (see helpers below).
  content: {
    level?: 2 | 3;
    text?: string;
    heading?: string;
    items?: ChecklistItem[];
    tradeId?: string;
    dataUrl?: string;
    caption?: string;
  };
  meta?: Record<string, unknown>;
}

export interface NoteMeta {
  date?: string;
  session?: string;
  tradesCount?: number;
}

export interface Note {
  id: string;
  userId: string;
  folderId: string;           // === collectionId in the new UI
  title: string;
  content: string;            // legacy/derived readable text (kept in sync)
  date: string;
  tags: string[];
  linkedTradeDate?: string;
  linkedTradeId?: string;
  noteDate?: string;
  favorite?: boolean;
  images: string[];
  createdAt: string;
  updatedAt: string;
  // ── New (optional so legacy notes remain valid) ──
  subtitle?: string;
  meta?: NoteMeta;
  blocks?: Block[];
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
  toggleFavorite: (id: string) => void;
  duplicateNote: (id: string) => Note | null;
  moveNote: (id: string, folderId: string) => void;
  /** Create or update the auto-generated note linked to a trade. */
  upsertTradeNote: (tradeId: string, title: string, content: string) => void;
  deleteNotesByTrade: (tradeId: string) => void;
  clearAll: () => void;
}

export const DEFAULT_FOLDER_NAMES = ['Diario de trading', 'Playbooks', 'Psicología', 'Revisión semanal'];

// New default collections (matches the redesign reference).
const DEFAULT_FOLDERS = [
  { name: 'Diario de trading', icon: '📓' },
  { name: 'Playbooks',         icon: '📖' },
  { name: 'Psicología',        icon: '🧠' },
  { name: 'Revisión semanal',  icon: '📅' },
];

/* ── Block helpers ──────────────────────────────────────────────────────── */

export function newBlock(type: BlockType, content: Block['content'] = {}): Block {
  return { id: nanoid(), type, content };
}

/** Strip HTML to readable plain text (decode a few common entities). */
export function htmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Derive a readable `content` string from blocks so search/previews stay useful.
 * Trade/image blocks become placeholders; dividers are skipped.
 */
export function deriveContentFromBlocks(blocks: Block[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'heading':
      case 'paragraph':
      case 'quote':
      case 'code':
        if (b.content.text?.trim()) parts.push(b.content.text.trim());
        break;
      case 'callout': {
        const seg = [b.content.heading, b.content.text].filter(Boolean).join(' ').trim();
        if (seg) parts.push(seg);
        break;
      }
      case 'checklist':
        (b.content.items ?? []).forEach(it => { if (it.text.trim()) parts.push(`- ${it.text.trim()}`); });
        break;
      case 'trade':
        parts.push('[Operación embebida]');
        break;
      case 'image':
        parts.push(b.content.caption?.trim() ? `[Imagen] ${b.content.caption.trim()}` : '[Imagen]');
        break;
      case 'divider':
        break;
    }
  }
  return parts.join('\n\n');
}

/** Build a starting blocks array from a legacy content string (plain or HTML). */
export function blocksFromContent(content: string): Block[] {
  const text = htmlToText(content);
  if (!text) return [newBlock('paragraph', { text: '' })];
  return text.split(/\n{2,}/).map(chunk => newBlock('paragraph', { text: chunk.trim() }));
}

/** Ensure a note has a blocks array, deriving one lazily from legacy content. */
export function ensureBlocks(note: Note): Block[] {
  if (note.blocks && note.blocks.length) return note.blocks;
  return blocksFromContent(note.content);
}

/* ── Store ──────────────────────────────────────────────────────────────── */

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
        const folder: Folder = { id: nanoid(), userId, name: 'Trade Notes', icon: '📎', order: 90, isDefault: true };
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
        const folder = get().folders.find(f => f.id === id);
        // Fallback: first remaining, non-system user folder (robust to renamed defaults).
        const fallback = get().folders.find(f => f.userId === userId && f.id !== id && !f.system);
        const movedNoteIds = get().notes.filter(n => n.folderId === id).map(n => n.id);
        set(s => ({
          folders: s.folders.filter(f => f.id !== id),
          notes: s.notes.map(n => n.folderId === id && fallback ? { ...n, folderId: fallback.id } : n),
        }));
        if (folder) {
          useUndoStore.getState().register({
            message: 'Colección eliminada',
            execute: () => set(s => ({
              folders: s.folders.some(f => f.id === folder.id) ? s.folders : [...s.folders, folder],
              notes: s.notes.map(n => movedNoteIds.includes(n.id) ? { ...n, folderId: folder.id } : n),
            })),
          });
        }
      },

      addNote: (folderId, title = 'Sin título', content = '', linkedTradeDate) => {
        const userId = useAuthStore.getState().user?.id ?? 'anonymous';
        const now = new Date().toISOString();
        const blocks = blocksFromContent(content);
        const note: Note = {
          id: nanoid(),
          userId,
          folderId,
          title,
          content: content || deriveContentFromBlocks(blocks),
          date: now.slice(0, 10),
          tags: [],
          linkedTradeDate,
          images: [],
          createdAt: now,
          updatedAt: now,
          blocks,
          meta: { date: now.slice(0, 10), tradesCount: 0 },
        };
        set(s => ({ notes: [...s.notes, note] }));
        return note;
      },

      updateNote: (id, updates) => {
        set(s => ({
          notes: s.notes.map(n => {
            if (n.id !== id) return n;
            const merged: Note = { ...n, ...updates, updatedAt: new Date().toISOString() };
            // When blocks change and no explicit content override is given, keep the
            // derived readable content + trade count in sync for external readers.
            if (updates.blocks && updates.content === undefined) {
              merged.content = deriveContentFromBlocks(updates.blocks);
              merged.meta = { ...merged.meta, tradesCount: updates.blocks.filter(b => b.type === 'trade').length };
            }
            return merged;
          }),
        }));
      },

      deleteNote: (id) => {
        const note = get().notes.find(n => n.id === id);
        set(s => ({ notes: s.notes.filter(n => n.id !== id) }));
        if (note) {
          useUndoStore.getState().register({
            message: 'Nota eliminada',
            execute: () => set(s => (s.notes.some(n => n.id === note.id) ? s : { notes: [...s.notes, note] })),
          });
        }
      },

      toggleFavorite: (id) => {
        set(s => ({ notes: s.notes.map(n => n.id === id ? { ...n, favorite: !n.favorite, updatedAt: new Date().toISOString() } : n) }));
      },

      duplicateNote: (id) => {
        const src = get().notes.find(n => n.id === id);
        if (!src) return null;
        const now = new Date().toISOString();
        const copy: Note = {
          ...src,
          id: nanoid(),
          title: `${src.title} (copia)`,
          favorite: false,
          linkedTradeId: undefined,
          blocks: (src.blocks ?? blocksFromContent(src.content)).map(b => ({ ...b, id: nanoid() })),
          createdAt: now,
          updatedAt: now,
        };
        set(s => ({ notes: [...s.notes, copy] }));
        return copy;
      },

      moveNote: (id, folderId) => {
        set(s => ({ notes: s.notes.map(n => n.id === id ? { ...n, folderId, updatedAt: new Date().toISOString() } : n) }));
      },

      upsertTradeNote: (tradeId, title, content) => {
        const userId = useAuthStore.getState().user?.id ?? 'anonymous';
        const existing = get().notes.find(n => n.userId === userId && n.linkedTradeId === tradeId);
        if (existing) {
          get().updateNote(existing.id, { title, content, blocks: blocksFromContent(content) });
          return;
        }
        const folder = get().ensureTradeNotesFolder();
        const now = new Date().toISOString();
        const note: Note = {
          id: nanoid(), userId, folderId: folder.id, title, content,
          date: now.slice(0, 10), tags: ['auto-generado'], linkedTradeId: tradeId,
          images: [], createdAt: now, updatedAt: now,
          blocks: blocksFromContent(content), meta: { date: now.slice(0, 10) },
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
    {
      name: 'trace_notebook',
      version: 1,
      // v0 → v1: give every legacy note a blocks[] + meta, and refresh the old
      // default-folder names/icons to the new collection set (non-destructive:
      // notes keep their folderId, 'Trade Notes' + system folders untouched).
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as { folders?: Folder[]; notes?: Note[] };
        if (!state) return state as unknown as NotebookStore;
        if (version < 1) {
          const rename: Record<string, { name: string; icon: string }> = {
            'Sessions Recap': { name: 'Revisión semanal', icon: '📅' },
            'Estrategias':    { name: 'Playbooks', icon: '📖' },
            'Mis notas':      { name: 'Diario de trading', icon: '📓' },
            'Psicología':     { name: 'Psicología', icon: '🧠' },
          };
          state.folders = (state.folders ?? []).map(f =>
            !f.system && rename[f.name] ? { ...f, ...rename[f.name] } : f,
          );
          state.notes = (state.notes ?? []).map(n => ({
            ...n,
            blocks: n.blocks && n.blocks.length ? n.blocks : blocksFromContent(n.content ?? ''),
            meta: n.meta ?? { date: n.date, tradesCount: 0 },
          }));
        }
        return state as unknown as NotebookStore;
      },
    }
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

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
  | 'trade' | 'image' | 'divider' | 'code' | 'quote'
  // ── New block types (notebook upgrade) ──
  | 'bulleted_list' | 'numbered_list' | 'table' | 'embed'
  | 'trades_table' | 'goal';

export interface ChecklistItem { id: string; text: string; checked: boolean }
export interface ListItem { id: string; text: string }

/** Live config for an embedded trades_table block (queried against tradeStore). */
export interface TradesTableConfig {
  template: 'weekly_review' | 'monthly_review' | 'by_setup' | 'by_account' | 'best' | 'worst' | 'custom';
  dateRange: { type: 'this_week' | 'this_month' | 'last_30' | 'all' | 'custom'; from?: string; to?: string };
  filters: { accountIds?: string[]; setups?: string[]; sessions?: string[]; directions?: ('long' | 'short')[] };
  columns: string[];
  groupBy: 'day' | 'setup' | 'account' | 'none';
  chart: { enabled: boolean; type: 'equity' | 'bars' | 'pie' | 'scatter'; position: 'top' | 'bottom' | 'side' };
  title: string;
}

export interface Block {
  id: string;
  type: BlockType;
  // Loose by design — shape depends on `type` (see helpers below).
  content: {
    level?: 1 | 2 | 3;
    text?: string;
    heading?: string;
    items?: ChecklistItem[];
    listItems?: ListItem[];
    tradeId?: string;
    dataUrl?: string;
    caption?: string;
    // New block payloads
    language?: string;            // code
    url?: string;                 // embed
    rows?: string[][];            // table
    config?: TradesTableConfig;   // trades_table
    goalId?: string;              // goal
  };
  meta?: Record<string, unknown>;
}

/* ── Rich note metadata (notebook upgrade — all optional for back-compat) ── */

export interface NoteCover {
  type: 'image' | 'color' | 'gradient';
  url?: string;        // image dataURL / link
  position?: number;   // 0–100 vertical object-position
  color?: string;      // color / gradient css
}

export type PropertyValueType = 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url';
export interface PropertyValue { type: PropertyValueType; value: unknown; options?: string[] }

export type NoteStatus = 'borrador' | 'en_progreso' | 'completado' | 'archivado';
export interface NoteProperties {
  date?: string;
  status?: NoteStatus;
  customFields?: Record<string, PropertyValue>;
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  url: string;          // dataURL (images / small files) or metadata
  name: string;
  size?: number;
  thumbnail?: string;
}

/** A user-saved template ("Guardar como plantilla"). Blocks are concrete. */
export interface CustomTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  tags?: string[];
  properties?: NoteProperties;
  cover?: NoteCover;
  blocks: Block[];
  custom: true;
  createdAt: string;
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
  // ── Notebook upgrade (all optional for back-compat) ──
  cover?: NoteCover;
  properties?: NoteProperties;
  linkedGoalIds?: string[];
  attachments?: Attachment[];
  calendarEventIds?: string[];
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
  customTemplates: CustomTemplate[];
  saveAsTemplate: (noteId: string, description?: string) => void;
  deleteCustomTemplate: (id: string) => void;
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

// New default collections (icons are lucide names — see pages/Notebook/icons).
const DEFAULT_FOLDERS = [
  { name: 'Diario de trading', icon: 'BookOpen' },
  { name: 'Playbooks',         icon: 'BookMarked' },
  { name: 'Psicología',        icon: 'Brain' },
  { name: 'Revisión semanal',  icon: 'CalendarDays' },
];

// Best-effort legacy emoji → lucide-name map (kept in sync with pages/Notebook/icons).
const EMOJI_TO_ICON: Record<string, string> = {
  '📓': 'BookOpen', '📖': 'BookMarked', '📕': 'Book', '📗': 'Book', '📘': 'Book',
  '🧠': 'Brain', '🎯': 'Target', '📈': 'TrendingUp', '📉': 'TrendingDown',
  '📊': 'BarChart3', '⚡': 'Zap', '🔥': 'Flame', '⭐': 'Star', '🌟': 'Star',
  '🏆': 'Trophy', '🥇': 'Award', '📅': 'CalendarDays', '📆': 'Calendar',
  '⏰': 'Clock', '⚠️': 'AlertTriangle', 'ℹ️': 'Info', '✅': 'CheckSquare',
  '📋': 'ClipboardList', '💡': 'Lightbulb', '✨': 'Sparkles', '🧭': 'Compass',
  '🚩': 'Flag', '🗂️': 'Folder', '🗂': 'Folder', '📁': 'Folder', '📂': 'FolderOpen',
  '🔖': 'Bookmark', '☕': 'Coffee', '🌅': 'Sunrise', '🌇': 'Sunset', '🌙': 'Moon',
  '📎': 'FileText', '📌': 'Bookmark', '📝': 'StickyNote',
};
const KNOWN_ICON_NAMES = new Set(Object.values(EMOJI_TO_ICON).concat(['Notebook', 'Activity', 'LineChart', 'AlertCircle', 'HelpCircle', 'ListChecks', 'Map', 'Archive', 'Timer']));
function iconName(raw: string | undefined): string {
  if (!raw) return 'Folder';
  if (KNOWN_ICON_NAMES.has(raw)) return raw;
  return EMOJI_TO_ICON[raw] ?? 'Folder';
}

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
      case 'bulleted_list':
      case 'numbered_list':
        (b.content.listItems ?? []).forEach((it, i) => { if (it.text.trim()) parts.push(`${b.type === 'numbered_list' ? `${i + 1}.` : '-'} ${it.text.trim()}`); });
        break;
      case 'table':
        (b.content.rows ?? []).forEach(row => { const seg = row.filter(Boolean).join(' · ').trim(); if (seg) parts.push(seg); });
        break;
      case 'embed':
        if (b.content.url?.trim()) parts.push(`[Embed] ${b.content.url.trim()}`);
        break;
      case 'trades_table':
        parts.push(b.content.config?.title ? `[Tabla de operaciones] ${b.content.config.title}` : '[Tabla de operaciones]');
        break;
      case 'goal':
        parts.push('[Meta]');
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
      customTemplates: [],

      saveAsTemplate: (noteId, description) => {
        const note = get().notes.find(n => n.id === noteId);
        if (!note) return;
        const tpl: CustomTemplate = {
          id: nanoid(),
          title: note.title || 'Plantilla sin título',
          description: description ?? (note.subtitle || 'Plantilla personalizada'),
          category: 'personal',
          tags: note.tags,
          properties: note.properties,
          cover: note.cover,
          blocks: (note.blocks ?? blocksFromContent(note.content)).map(b => ({ ...b, id: nanoid() })),
          custom: true,
          createdAt: new Date().toISOString(),
        };
        set(s => ({ customTemplates: [...s.customTemplates, tpl] }));
      },

      deleteCustomTemplate: (id) => set(s => ({ customTemplates: s.customTemplates.filter(t => t.id !== id) })),

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
        const folder: Folder = { id: nanoid(), userId, name: DIARIO_FOLDER_NAME, icon: 'BookOpen', order: -1, system: true };
        set(s => ({ folders: [...s.folders, folder] }));
        return folder;
      },

      ensureTradeNotesFolder: () => {
        const userId = useAuthStore.getState().user?.id ?? 'anonymous';
        const existing = get().folders.find(f => f.userId === userId && f.name === 'Trade Notes');
        if (existing) return existing;
        const folder: Folder = { id: nanoid(), userId, name: 'Trade Notes', icon: 'FileText', order: 90, isDefault: true };
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
      version: 3,
      // v0 → v1: give every legacy note a blocks[] + meta, refresh old default-folder
      //          names to the new collection set (non-destructive: notes keep their
      //          folderId; 'Trade Notes' + system folders untouched).
      // v1 → v2: convert every folder's emoji icon to a lucide icon name.
      // v2 → v3: notebook upgrade (cover/properties/attachments/goals/calendar).
      //          Purely additive — every new Note field is optional, so legacy
      //          notes stay valid with no transform needed.
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as { folders?: Folder[]; notes?: Note[] };
        if (!state) return state as unknown as NotebookStore;
        if (version < 1) {
          const rename: Record<string, string> = {
            'Sessions Recap': 'Revisión semanal',
            'Estrategias': 'Playbooks',
            'Mis notas': 'Diario de trading',
          };
          state.folders = (state.folders ?? []).map(f =>
            !f.system && rename[f.name] ? { ...f, name: rename[f.name] } : f,
          );
          state.notes = (state.notes ?? []).map(n => ({
            ...n,
            blocks: n.blocks && n.blocks.length ? n.blocks : blocksFromContent(n.content ?? ''),
            meta: n.meta ?? { date: n.date, tradesCount: 0 },
          }));
        }
        if (version < 2) {
          state.folders = (state.folders ?? []).map(f => ({ ...f, icon: iconName(f.icon) }));
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

import { useState } from 'react';
import {
  BookOpen, BookMarked, Book, FileText, Notebook, StickyNote,
  Brain, Target, TrendingUp, TrendingDown, LineChart, BarChart3,
  Activity, Zap, Flame, Star, Award, Trophy,
  Calendar, CalendarDays, Clock, Timer,
  AlertTriangle, AlertCircle, Info, HelpCircle,
  CheckSquare, ListChecks, ClipboardList,
  Lightbulb, Sparkles, Compass, Map, Flag,
  Folder, FolderOpen, Archive, Bookmark,
  Coffee, Sunrise, Sunset, Moon, Search,
  type LucideIcon,
} from 'lucide-react';

/** Curated lucide set for collections (order shown in the picker grid). */
export const NB_ICON_SET: Record<string, LucideIcon> = {
  BookOpen, BookMarked, Book, FileText, Notebook, StickyNote,
  Brain, Target, TrendingUp, TrendingDown, LineChart, BarChart3,
  Activity, Zap, Flame, Star, Award, Trophy,
  Calendar, CalendarDays, Clock, Timer,
  AlertTriangle, AlertCircle, Info, HelpCircle,
  CheckSquare, ListChecks, ClipboardList,
  Lightbulb, Sparkles, Compass, Map, Flag,
  Folder, FolderOpen, Archive, Bookmark,
  Coffee, Sunrise, Sunset, Moon,
};

/** Best-effort emoji → lucide-name mapping for migrating legacy collections. */
const EMOJI_TO_NAME: Record<string, string> = {
  '📓': 'BookOpen', '📖': 'BookMarked', '📕': 'Book', '📗': 'Book', '📘': 'Book',
  '🧠': 'Brain', '🎯': 'Target', '📈': 'TrendingUp', '📉': 'TrendingDown',
  '📊': 'BarChart3', '⚡': 'Zap', '🔥': 'Flame', '⭐': 'Star', '🌟': 'Star',
  '🏆': 'Trophy', '🥇': 'Award', '📅': 'CalendarDays', '📆': 'Calendar',
  '⏰': 'Clock', '⏱️': 'Timer', '⚠️': 'AlertTriangle', 'ℹ️': 'Info',
  '✅': 'CheckSquare', '📋': 'ClipboardList', '💡': 'Lightbulb', '✨': 'Sparkles',
  '🧭': 'Compass', '🗺️': 'Map', '🚩': 'Flag', '🗂️': 'Folder', '🗂': 'Folder',
  '📁': 'Folder', '📂': 'FolderOpen', '🗄️': 'Archive', '🔖': 'Bookmark',
  '☕': 'Coffee', '🌅': 'Sunrise', '🌇': 'Sunset', '🌙': 'Moon', '📎': 'FileText',
  '📌': 'Bookmark', '📝': 'StickyNote',
};

/** Convert any stored icon value to a lucide icon name (used by store migration). */
export function toIconName(raw: string | undefined): string {
  if (!raw) return 'Folder';
  if (NB_ICON_SET[raw]) return raw;
  return EMOJI_TO_NAME[raw] ?? 'Folder';
}

/** Renders a collection icon: a lucide glyph when known, else the raw emoji. */
export function NotebookIcon({ name, size = 16, color = '#6b7280' }: { name: string; size?: number; color?: string }) {
  const Cmp = NB_ICON_SET[name];
  if (Cmp) return <Cmp size={size} color={color} strokeWidth={2} />;
  // Legacy emoji fallback (never breaks on old data).
  return <span style={{ fontSize: size, lineHeight: 1 }}>{name}</span>;
}

/** Popover grid to pick a collection icon from the curated lucide set. */
export function IconPicker({ onSelect, onClose, current }: { onSelect: (name: string) => void; onClose: () => void; current?: string }) {
  const [q, setQ] = useState('');
  const names = Object.keys(NB_ICON_SET).filter(n => n.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70 }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 34, left: 12, zIndex: 71, background: '#151519', border: '1px solid #2a2c33', borderRadius: 12, padding: 10, width: 268, boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Search size={13} color="#6b7280" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar icono…"
            style={{ width: '100%', boxSizing: 'border-box', background: '#0d0d0f', border: '1px solid #1e2029', borderRadius: 8, padding: '7px 10px 7px 30px', fontSize: '0.76rem', color: '#f7f8fa', outline: 'none', fontFamily: "'Space Grotesk', sans-serif" }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
          {names.map(n => {
            const Cmp = NB_ICON_SET[n];
            const sel = n === current;
            return (
              <button key={n} title={n} onClick={() => { onSelect(n); onClose(); }}
                style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: sel ? 'rgba(79,143,255,0.12)' : 'transparent', border: sel ? '1px solid rgba(79,143,255,0.5)' : '1px solid transparent', borderRadius: 8, cursor: 'pointer' }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}>
                <Cmp size={16} color={sel ? '#4f8fff' : '#a1ab88'} />
              </button>
            );
          })}
          {names.length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6b7280', fontSize: '0.75rem', padding: 12 }}>Sin resultados</div>}
        </div>
      </div>
    </>
  );
}

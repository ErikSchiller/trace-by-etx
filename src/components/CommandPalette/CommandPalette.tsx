import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserTrades, type Trade } from '../../store/tradeStore';
import { useUserNotes } from '../../store/notebookStore';
import { useUserAccounts } from '../../store/propFirmStore';
import { useSettingsStore } from '../../store/settingsStore';
import { TradeDetailModal } from '../Modals/TradeDetailModal';
import { openWeeklyRecap } from '../WeeklyRecap/RecapPrompt';

const fontBody = "'Space Grotesk', sans-serif";
const RECENT_KEY = 'cmd_palette_recent';
const ACCENTS = ['#4f8fff', '#7861ff', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444'];

interface CmdItem {
  id: string;
  section: string;
  icon: string;
  label: string;
  subtitle?: string;
  shortcut?: string;
  keywords?: string;
  run: () => void;
  recordable?: boolean; // stored in recents
  inline?: boolean;     // does not close the palette
}

/** Best fuzzy score of query against text, or null when there is no match. */
function fuzzy(q: string, text: string): number | null {
  if (!q) return 0;
  const s = text.toLowerCase();
  const query = q.toLowerCase();
  const idx = s.indexOf(query);
  if (idx >= 0) return 1000 - idx;
  let ti = 0, score = 0, last = -1;
  for (const ch of query) {
    const found = s.indexOf(ch, ti);
    if (found < 0) return null;
    score += found === last + 1 ? 5 : 1;
    last = found; ti = found + 1;
  }
  return score;
}
function itemScore(q: string, it: CmdItem): number | null {
  return fuzzy(q, `${it.label} ${it.subtitle ?? ''} ${it.keywords ?? ''}`);
}

function money(n: number) { const s = n >= 0 ? '+' : '-'; return `${s}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`; }
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function shortDate(iso: string) { const [, m, d] = iso.split('-'); return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]}`; }

function loadRecent(): string[] { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } }
function pushRecent(id: string) {
  const cur = loadRecent().filter(x => x !== id);
  cur.unshift(id);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, 5))); } catch { /* ignore */ }
}

export function CommandPalette() {
  const navigate = useNavigate();
  const trades = useUserTrades();
  const notes = useUserNotes();
  const accounts = useUserAccounts();
  const settings = useSettingsStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const [colorMode, setColorMode] = useState(false);
  const [detailTrade, setDetailTrade] = useState<Trade | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => { setOpen(false); setQuery(''); setSel(0); setColorMode(false); };

  // Global open triggers: Cmd/Ctrl+K, "/", and a window event (topbar button).
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); return; }
      if (e.key === '/' && !isTyping(e.target)) { e.preventDefault(); setOpen(true); }
    };
    const onEvent = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('trace:open-command-palette', onEvent);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('trace:open-command-palette', onEvent); };
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 20); }, [open]);
  useEffect(() => { setSel(0); }, [query]);

  const go = (path: string) => { navigate(path); close(); };
  const afterNav = (fn: () => void) => { close(); setTimeout(fn, 200); };

  // Static action + navigation items
  const actionItems = useMemo<CmdItem[]>(() => [
    { id: 'act-add-trade', section: 'ACCIONES', icon: '✚', label: 'Añadir operación', shortcut: '⌘N', keywords: 'nueva trade operacion registrar', recordable: true, run: () => { close(); window.dispatchEvent(new CustomEvent('trace:open-add-trade')); } },
    { id: 'act-new-note', section: 'ACCIONES', icon: '📝', label: 'Nueva nota', keywords: 'notebook nota crear', recordable: true, run: () => afterNav(() => { navigate('/notebook'); setTimeout(() => window.dispatchEvent(new CustomEvent('trace:new-note')), 220); }) },
    { id: 'act-payout', section: 'ACCIONES', icon: '💰', label: 'Registrar payout', keywords: 'prop firm cobro payout', recordable: true, run: () => go('/prop-firms') },
    { id: 'act-recap', section: 'ACCIONES', icon: '📅', label: 'Generar recap semanal', keywords: 'resumen semana recap', recordable: true, run: () => { close(); openWeeklyRecap(); } },
    { id: 'nav-dashboard', section: 'ACCIONES', icon: '📊', label: 'Ir al dashboard', shortcut: '⌘1', keywords: 'inicio home', recordable: true, run: () => go('/dashboard') },
    { id: 'nav-journal', section: 'ACCIONES', icon: '📓', label: 'Ir al diario', shortcut: '⌘2', keywords: 'diario journal daily', recordable: true, run: () => go('/journal') },
    { id: 'nav-trades', section: 'ACCIONES', icon: '📋', label: 'Ir a operaciones', shortcut: '⌘3', keywords: 'trades operaciones lista', recordable: true, run: () => go('/trades') },
    { id: 'nav-notebook', section: 'ACCIONES', icon: '🗒️', label: 'Ir al notebook', shortcut: '⌘4', keywords: 'notas notebook', recordable: true, run: () => go('/notebook') },
    { id: 'nav-reports', section: 'ACCIONES', icon: '🎯', label: 'Ir a reportes', keywords: 'reportes analisis', recordable: true, run: () => go('/reports') },
    { id: 'nav-progress', section: 'ACCIONES', icon: '📈', label: 'Ir a progress tracker', keywords: 'progreso rutina rachas', recordable: true, run: () => go('/progress') },
    { id: 'nav-propfirms', section: 'ACCIONES', icon: '🏦', label: 'Ir a prop firms', keywords: 'prop firm cuentas', recordable: true, run: () => go('/prop-firms') },
    { id: 'nav-simulator', section: 'ACCIONES', icon: '🎲', label: 'Ir al simulador', keywords: 'simulador montecarlo', recordable: true, run: () => go('/simulator') },
    { id: 'nav-settings', section: 'ACCIONES', icon: '⚙️', label: 'Ajustes', shortcut: '⌘,', keywords: 'settings configuracion', recordable: true, run: () => go('/settings') },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [navigate]);

  const themeItems = useMemo<CmdItem[]>(() => [
    { id: 'theme-accent', section: 'TEMA Y APARIENCIA', icon: '🎨', label: 'Cambiar color de acento', inline: true, run: () => setColorMode(m => !m) },
    { id: 'theme-compact', section: 'TEMA Y APARIENCIA', icon: '🌓', label: `${settings.compactMode ? 'Desactivar' : 'Activar'} modo compacto`, run: () => { settings.updateSettings({ compactMode: !settings.compactMode }); close(); } },
    { id: 'theme-sounds', section: 'TEMA Y APARIENCIA', icon: settings.soundsEnabled ? '🔇' : '🔈', label: `${settings.soundsEnabled ? 'Silenciar' : 'Activar'} sonidos`, run: () => { settings.updateSettings({ soundsEnabled: !settings.soundsEnabled }); close(); } },
  ], [settings]);

  // Build grouped, ordered result list
  const groups = useMemo<{ title: string; items: CmdItem[] }[]>(() => {
    const q = query.trim();
    if (!q) {
      const staticById = new Map([...actionItems, ...themeItems].map(i => [i.id, i]));
      const recent = loadRecent().map(id => staticById.get(id)).filter((i): i is CmdItem => !!i).slice(0, 5);
      const out: { title: string; items: CmdItem[] }[] = [];
      if (recent.length) out.push({ title: 'RECIENTES', items: recent });
      out.push({ title: 'ACCIONES', items: actionItems });
      out.push({ title: 'TEMA Y APARIENCIA', items: themeItems });
      return out;
    }

    const scored = actionItems
      .map(it => ({ it, s: itemScore(q, it) }))
      .filter((x): x is { it: CmdItem; s: number } => x.s !== null)
      .sort((a, b) => b.s - a.s)
      .map(x => x.it);

    const tradeItems: CmdItem[] = trades
      .filter(t => fuzzy(q, `${t.asset} ${t.setup} ${t.quickNote ?? ''} ${t.postTradeNotes ?? ''}`) !== null)
      .slice(0, 6)
      .map(t => ({
        id: `trade-${t.id}`, section: 'TRADES', icon: t.pnl >= 0 ? '🟦' : '🟥',
        label: `${t.asset} ${t.direction === 'long' ? 'Long' : 'Short'} ${money(t.pnl)}`,
        subtitle: `${shortDate(t.date)}${t.setup ? ` · ${t.setup}` : ''}`,
        run: () => setDetailTrade(t),
      }));

    const noteItems: CmdItem[] = notes
      .filter(n => fuzzy(q, `${n.title} ${n.content.replace(/<[^>]+>/g, ' ')}`) !== null)
      .slice(0, 6)
      .map(n => ({
        id: `note-${n.id}`, section: 'NOTAS', icon: '📄',
        label: n.title || 'Sin título',
        subtitle: n.content.replace(/<[^>]+>/g, ' ').trim().slice(0, 48) || undefined,
        run: () => afterNav(() => { navigate('/notebook'); setTimeout(() => window.dispatchEvent(new CustomEvent('trace:open-note', { detail: { id: n.id } })), 220); }),
      }));

    const accountItems: CmdItem[] = accounts
      .filter(a => fuzzy(q, `${a.firm} ${Math.round(a.accountSize / 1000)}K`) !== null)
      .slice(0, 6)
      .map(a => ({
        id: `acc-${a.id}`, section: 'CUENTAS', icon: '🏦',
        label: `${a.firm} $${Math.round(a.accountSize / 1000)}K`,
        subtitle: a.phase.replace('_', ' '),
        run: () => go(`/prop-firms/${a.id}`),
      }));

    const out: { title: string; items: CmdItem[] }[] = [];
    if (scored.length) out.push({ title: 'ACCIONES', items: scored });
    if (tradeItems.length) out.push({ title: 'TRADES', items: tradeItems });
    if (noteItems.length) out.push({ title: 'NOTAS', items: noteItems });
    if (accountItems.length) out.push({ title: 'CUENTAS', items: accountItems });
    return out;
  }, [query, actionItems, themeItems, trades, notes, accounts]); // eslint-disable-line react-hooks/exhaustive-deps

  const flat = useMemo(() => groups.flatMap(g => g.items), [groups]);

  const runItem = (it: CmdItem) => {
    if (it.recordable) pushRecent(it.id);
    it.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => (flat.length ? (s + 1) % flat.length : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => (flat.length ? (s - 1 + flat.length) % flat.length : 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = flat[sel]; if (it) runItem(it); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  };

  if (!open) {
    return <TradeDetailModal trade={detailTrade} onClose={() => setDetailTrade(null)} />;
  }

  let flatIdx = -1;
  return (
    <>
      <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '15vh', animation: 'cmdFade 0.15s ease-out' }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 620, background: '#15171d', border: '1px solid #1e2029', borderRadius: 12, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', fontFamily: fontBody, animation: 'cmdSlide 0.15s ease-out' }}>
          {/* Header */}
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #1e2029', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#4a4a60', fontSize: 15 }}>⌕</span>
            <input
              ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onKeyDown}
              placeholder="Buscar acciones, páginas, trades..."
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f7f8fa', fontSize: '0.95rem', fontFamily: fontBody }}
            />
            <span style={{ fontSize: '0.65rem', color: '#5a6080', border: '1px solid #2a2d38', borderRadius: 5, padding: '2px 6px' }}>Esc</span>
          </div>

          {/* Inline accent color picker */}
          {colorMode && (
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #1e2029', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.72rem', color: '#8a90a8' }}>Color de acento:</span>
              {ACCENTS.map(hex => (
                <button key={hex} onClick={() => { settings.updateSettings({ accentColor: hex }); close(); }} style={{ width: 24, height: 24, borderRadius: '50%', background: hex, border: settings.accentColor.toLowerCase() === hex ? '2px solid #fff' : 'none', cursor: 'pointer' }} />
              ))}
            </div>
          )}

          {/* Body */}
          <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: 8 }}>
            {flat.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: '#4a4a60', fontSize: '0.82rem' }}>Sin resultados para “{query}”</div>
            ) : (
              groups.map(group => (
                <div key={group.title}>
                  <div style={{ fontSize: '0.6rem', color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, padding: '8px 12px 4px' }}>{group.title}</div>
                  {group.items.map(it => {
                    flatIdx += 1;
                    const active = flatIdx === sel;
                    const idx = flatIdx;
                    return (
                      <div
                        key={it.id}
                        onMouseEnter={() => setSel(idx)}
                        onClick={() => runItem(it)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 7, cursor: 'pointer',
                          background: active ? 'rgba(79,143,255,0.08)' : 'transparent',
                        }}
                      >
                        <span style={{ fontSize: 15, width: 18, textAlign: 'center', color: active ? '#4f8fff' : '#8a90a8' }}>{it.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', color: '#e8eaf0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</div>
                          {it.subtitle && <div style={{ fontSize: '0.7rem', color: '#5a6080', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.subtitle}</div>}
                        </div>
                        {it.shortcut && <span style={{ fontSize: '0.68rem', color: '#5a6080', border: '1px solid #2a2d38', borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>{it.shortcut}</span>}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <style>{`
            @keyframes cmdFade { from { opacity: 0; } to { opacity: 1; } }
            @keyframes cmdSlide { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          `}</style>
        </div>
      </div>
      <TradeDetailModal trade={detailTrade} onClose={() => setDetailTrade(null)} />
    </>
  );
}

export default CommandPalette;

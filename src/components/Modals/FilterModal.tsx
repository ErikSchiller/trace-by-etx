import { useMemo, useState, useEffect } from 'react';
import { useUserTrades, type Direction, type Session } from '../../store/tradeStore';
import { useFilterStore, type TradeStatus, type TradeFilters } from '../../store/filterStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useUserAccounts, getActiveAccounts } from '../../store/propFirmStore';
import { useToast } from '../UI/ToastProvider';
import { Button } from '../UI/Button';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const label: React.CSSProperties = { fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, display: 'block' };

const DIRECTIONS: { v: Direction; l: string }[] = [{ v: 'long', l: 'Long' }, { v: 'short', l: 'Short' }];
const SESSIONS: { v: Session; l: string }[] = [{ v: 'london', l: 'Londres' }, { v: 'new_york', l: 'Nueva York' }, { v: 'asia', l: 'Asia' }, { v: 'premarket', l: 'Pre-market' }];
const STATUSES: { v: TradeStatus; l: string }[] = [{ v: 'win', l: 'Ganancia' }, { v: 'loss', l: 'Pérdida' }, { v: 'be', l: 'Break Even' }];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      fontFamily: fontBody, fontSize: '0.76rem', padding: '5px 12px', borderRadius: 14, cursor: 'pointer',
      border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
      background: active ? 'rgba(79,143,255,0.1)' : 'transparent',
      color: active ? 'var(--blue)' : 'var(--text-secondary)',
    }}>{children}</button>
  );
}

export function FilterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const allTrades = useUserTrades();
  const current = useFilterStore();
  const setFilters = useFilterStore(s => s.setFilters);
  const clearFilters = useFilterStore(s => s.clearFilters);
  const setups = useSettingsStore(s => s.setups);
  const accounts = getActiveAccounts(useUserAccounts());
  const { push } = useToast();

  const assets = useMemo(() => [...new Set(allTrades.map(t => t.asset))].sort(), [allTrades]);

  const [draft, setDraft] = useState<TradeFilters>(() => ({ assets: current.assets, directions: current.directions, sessions: current.sessions, setups: current.setups, statuses: current.statuses, accountId: current.accountId }));
  useEffect(() => { if (open) setDraft({ assets: current.assets, directions: current.directions, sessions: current.sessions, setups: current.setups, statuses: current.statuses, accountId: current.accountId }); }, [open]); // eslint-disable-line

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggle = <K extends 'assets' | 'directions' | 'sessions' | 'setups' | 'statuses'>(key: K, val: string) =>
    setDraft(d => { const arr = d[key] as string[]; return { ...d, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }; });

  const apply = () => { setFilters(draft); push({ kind: 'success', text: 'Filtros aplicados' }); onClose(); };
  const clearAll = () => setDraft({ assets: [], directions: [], sessions: [], setups: [], statuses: [], accountId: '' });

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 480, fontFamily: fontBody, color: 'var(--text)', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ background: 'var(--card-2)', borderBottom: '1px solid var(--border-subtle)', padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Filtros</h2>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={label}>Activo</label>
            {assets.length === 0 ? <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sin activos aún</div> : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {assets.map(a => <Chip key={a} active={draft.assets.includes(a)} onClick={() => toggle('assets', a)}>{a}</Chip>)}
              </div>
            )}
          </div>
          <div>
            <label style={label}>Dirección</label>
            <div style={{ display: 'flex', gap: 6 }}>{DIRECTIONS.map(d => <Chip key={d.v} active={draft.directions.includes(d.v)} onClick={() => toggle('directions', d.v)}>{d.l}</Chip>)}</div>
          </div>
          <div>
            <label style={label}>Sesión</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{SESSIONS.map(s => <Chip key={s.v} active={draft.sessions.includes(s.v)} onClick={() => toggle('sessions', s.v)}>{s.l}</Chip>)}</div>
          </div>
          {setups.length > 0 && (
            <div>
              <label style={label}>Setup</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{setups.map(s => <Chip key={s} active={draft.setups.includes(s)} onClick={() => toggle('setups', s)}>{s}</Chip>)}</div>
            </div>
          )}
          <div>
            <label style={label}>Estado</label>
            <div style={{ display: 'flex', gap: 6 }}>{STATUSES.map(s => <Chip key={s.v} active={draft.statuses.includes(s.v)} onClick={() => toggle('statuses', s.v)}>{s.l}</Chip>)}</div>
          </div>
          {accounts.length > 0 && (
            <div>
              <label style={label}>Cuenta</label>
              <select value={draft.accountId} onChange={e => setDraft(d => ({ ...d, accountId: e.target.value }))}
                style={{ fontFamily: fontBody, width: '100%', background: 'var(--card-2)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}>
                <option value="">Todas</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.firm} · ${Math.round(a.accountSize / 1000)}K</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => { clearAll(); clearFilters(); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.78rem', fontFamily: fontBody, textDecoration: 'underline' }}>Limpiar todo</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={apply}>Aplicar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FilterModal;

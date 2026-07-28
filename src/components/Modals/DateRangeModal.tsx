import { useEffect, useMemo, useState } from 'react';
import { useUserTrades } from '../../store/tradeStore';
import { useDateRangeStore, resolveRange, PRESET_LABEL, type DatePreset } from '../../store/dateRangeStore';
import { useToast } from '../UI/ToastProvider';
import { Button } from '../UI/Button';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";

const PRESETS: DatePreset[] = ['today', 'yesterday', 'this_week', 'this_month', 'last_30', 'last_90', 'this_year', 'all', 'custom'];

function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000) + 1;
}

export function DateRangeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const allTrades = useUserTrades();
  const store = useDateRangeStore();
  const setPreset = useDateRangeStore(s => s.setPreset);
  const setCustom = useDateRangeStore(s => s.setCustom);
  const reset = useDateRangeStore(s => s.reset);
  const { push } = useToast();

  const [draft, setDraft] = useState<{ preset: DatePreset; from: string | null; to: string | null }>(() => ({ preset: store.preset, from: store.from, to: store.to }));
  useEffect(() => { if (open) setDraft({ preset: store.preset, from: store.from, to: store.to }); }, [open]); // eslint-disable-line

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const range = useMemo(() => resolveRange(draft), [draft]);
  const info = useMemo(() => {
    if (!range) return { days: null as number | null, count: allTrades.length };
    const count = allTrades.filter(t => t.date >= range.from && t.date <= range.to).length;
    return { days: daysBetween(range.from, range.to), count };
  }, [range, allTrades]);

  if (!open) return null;

  const apply = () => {
    if (draft.preset === 'custom') setCustom(draft.from, draft.to);
    else setPreset(draft.preset);
    push({ kind: 'success', text: 'Rango aplicado' });
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 720, fontFamily: fontBody, color: 'var(--text)', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ background: 'var(--card-2)', borderBottom: '1px solid var(--border-subtle)', padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Rango de fechas</h2>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
        </div>

        <div className="dr-body" style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 0 }}>
          {/* presets */}
          <div style={{ borderRight: '1px solid var(--border-subtle)', padding: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {PRESETS.map(p => {
              const active = draft.preset === p;
              return (
                <button key={p} onClick={() => setDraft(d => ({ ...d, preset: p }))} style={{
                  fontFamily: fontBody, width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', border: 'none',
                  background: active ? 'rgba(79,143,255,0.1)' : 'transparent', color: active ? 'var(--blue)' : 'var(--text-secondary)',
                }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >{PRESET_LABEL[p]}</button>
              );
            })}
          </div>

          {/* range detail */}
          <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {draft.preset === 'custom' ? (
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 6 }}>Desde</label>
                  <input type="date" value={draft.from ?? ''} max={draft.to ?? undefined} onChange={e => setDraft(d => ({ ...d, from: e.target.value || null }))}
                    style={{ fontFamily: fontBody, background: 'var(--card-2)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 6 }}>Hasta</label>
                  <input type="date" value={draft.to ?? ''} min={draft.from ?? undefined} onChange={e => setDraft(d => ({ ...d, to: e.target.value || null }))}
                    style={{ fontFamily: fontBody, background: 'var(--card-2)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                </div>
              </div>
            ) : (
              <div style={{ ...cardBox }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>Rango seleccionado</div>
                <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {range ? `${range.from} → ${range.to}` : 'Todo el tiempo'}
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {info.days !== null ? `${info.days} día${info.days === 1 ? '' : 's'} seleccionado${info.days === 1 ? '' : 's'} · ` : ''}{info.count} operacion{info.count === 1 ? '' : 'es'} en este rango
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => { reset(); setDraft({ preset: 'all', from: null, to: null }); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.78rem', fontFamily: fontBody, textDecoration: 'underline' }}>Restablecer</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={apply}>Aplicar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const cardBox: React.CSSProperties = { background: 'var(--card-2)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '14px 16px' };

export default DateRangeModal;

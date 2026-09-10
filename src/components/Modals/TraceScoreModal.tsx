import { useEffect } from 'react';
import type { TraceBreakdown } from '../../utils/traceScore';

const HEAD = "'Syne', sans-serif";
const BODY = "'Space Grotesk', sans-serif";
const C = { bg: '#0a0a0c', card: '#15171d', card2: '#131418', border: '#1e2029', blue: '#4f8fff', text: '#f7f8fa', text2: '#c8c8d8', muted: '#6b7280' };

export function TraceScoreModal({ open, onClose, breakdown }: { open: boolean; onClose: () => void; breakdown: TraceBreakdown }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 340, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: BODY }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#111113', border: `1px solid ${C.border}`, borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
        {/* header */}
        <div style={{ padding: '22px 28px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: '1.25rem', color: C.text }}>Cómo se calcula tu TRACE Score</div>
              <div style={{ fontSize: '0.85rem', color: C.muted, marginTop: 4 }}>6 dimensiones que miden tu evolución como trader.</div>
            </div>
            <button onClick={onClose} aria-label="Cerrar" style={{ width: 34, height: 34, borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
          </div>
        </div>

        {/* body */}
        <div style={{ overflowY: 'auto', padding: '8px 28px 20px' }}>
          {breakdown.dims.map(d => {
            const pctFill = Math.round((d.score / d.max) * 100);
            return (
              <div key={d.key} style={{ padding: '20px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: '1.02rem', color: C.text, flex: 1 }}>{d.label}</div>
                  <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: '0.88rem', color: C.blue, whiteSpace: 'nowrap' }}>{d.score.toFixed(1)}<span style={{ color: C.muted }}>/{d.max}</span></div>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ width: `${pctFill}%`, height: '100%', background: C.blue, borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
                <div style={{ fontSize: '0.85rem', color: C.text2, lineHeight: 1.6 }}>{d.explanation}</div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.8rem', color: C.muted, marginTop: 8 }}>
                  <span>Valor actual: <b style={{ color: C.text }}>{d.valueLabel}</b></span>
                  <span>Contribución: <b style={{ color: C.text }}>{d.score.toFixed(1)} / {d.max}</b></span>
                </div>
                <div style={{ marginTop: 12, background: C.card2, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.blue}`, borderRadius: 8, padding: '12px 16px' }}>
                  <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: '0.82rem', color: C.text, marginBottom: 4 }}>💡 Cómo mejorar</div>
                  <div style={{ fontSize: '0.82rem', color: C.text2, lineHeight: 1.55 }}>{d.tip}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* footer */}
        <div style={{ padding: '16px 28px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: BODY, fontSize: '0.9rem', color: C.text2 }}>
            Total: <b style={{ color: C.text }}>{breakdown.total}/100</b> · Grado <b style={{ color: breakdown.grade.color }}>{breakdown.grade.label}</b>
          </div>
          <button onClick={onClose} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 22px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: BODY }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default TraceScoreModal;

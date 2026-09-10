import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInsightPanel } from '../../store/insightPanelStore';
import { getInsightsForContext } from '../../utils/insightEngine';
import { useUserTrades, type Trade } from '../../store/tradeStore';
import { useUserAccounts } from '../../store/propFirmStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useFilterStore } from '../../store/filterStore';
import { useNotebookStore } from '../../store/notebookStore';
import { useToast } from './ToastProvider';
import { nodeToPngBlob } from '../../utils/domImage';
import { TradeDetailModal } from '../Modals/TradeDetailModal';

const HEAD = "'Syne', sans-serif";
const BODY = "'Space Grotesk', sans-serif";
const C = { bg: '#0d0d0f', panel: '#0d0d0f', card: '#15171d', border: '#1e2029', blue: '#4f8fff', red: '#ef4444', text: '#f7f8fa', text2: '#c8d4e8', muted: '#6b7280' };
const tone = (t?: string) => t === 'blue' ? C.blue : t === 'red' ? C.red : C.text;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, fontWeight: 700, margin: '22px 0 10px' }}>{children}</div>;
}

export function ChartInsightPanel() {
  const { isOpen, context, close } = useInsightPanel();
  const trades = useUserTrades();
  const accounts = useUserAccounts();
  const sym = useSettingsStore(s => s.currencySymbol);
  const setFilters = useFilterStore(s => s.setFilters);
  const addNote = useNotebookStore(s => s.addNote);
  const ensureDiario = useNotebookStore(s => s.ensureDiarioFolder);
  const { push } = useToast();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<Trade | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !detail) close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close, detail]);

  const data = useMemo(() => (context ? getInsightsForContext(context, trades, accounts, sym) : null), [context, trades, accounts, sym]);
  if (!isOpen || !data) return null;

  const applyFilter = () => { if (data.filter) setFilters(data.filter); close(); navigate('/trades'); };
  const createNote = () => {
    const f = ensureDiario();
    addNote(f.id, data.noteSeed || `Análisis · ${data.title}`, '');
    close(); navigate('/notebook'); push({ kind: 'success', text: 'Nota creada en el Notebook' });
  };
  const share = async () => {
    if (!panelRef.current) return;
    setBusy(true);
    try {
      const blob = await nodeToPngBlob(panelRef.current, { bg: C.bg, scale: 2 });
      const CI = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
      if (navigator.clipboard && CI) { await navigator.clipboard.write([new CI({ 'image/png': blob })]); push({ kind: 'success', text: 'Insight copiado como imagen' }); }
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'trace-insight.png'; a.click(); }
    } catch { push({ kind: 'error', text: 'No se pudo generar la imagen' }); }
    setBusy(false);
  };

  return (
    <>
      <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 149, background: 'rgba(0,0,0,0.4)', animation: 'insightFade 0.2s ease' }} />
      <div ref={panelRef} role="dialog" aria-modal="true" style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(480px, 100vw)', background: C.panel, borderLeft: `1px solid ${C.border}`, zIndex: 150, overflowY: 'auto', padding: '28px 26px', fontFamily: BODY, animation: 'insightSlide 0.25s cubic-bezier(0.16,1,0.3,1)', boxShadow: '-20px 0 60px rgba(0,0,0,0.4)' }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, fontWeight: 700 }}>{data.tag}</div>
            <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: '1.2rem', color: C.text, marginTop: 4 }}>{data.title}</div>
          </div>
          <button onClick={close} aria-label="Cerrar" style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* DATOS */}
        <SectionLabel>Datos</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {data.stats.map((s, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: '0.68rem', color: C.muted }}>{s.label}</div>
              <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: '1.15rem', color: tone(s.tone), marginTop: 3 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* PATRONES */}
        {data.patterns.length > 0 && <>
          <SectionLabel>Patrones detectados</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.patterns.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{p.emoji}</span>
                <span style={{ fontSize: '0.8rem', color: C.text2, lineHeight: 1.5 }}>{p.text}</span>
              </div>
            ))}
          </div>
        </>}

        {/* RECOMENDACIONES */}
        {data.recommendations.length > 0 && <>
          <SectionLabel>Cómo mejorar</SectionLabel>
          {data.recommendations.map((r, i) => (
            <div key={i} style={{ background: 'rgba(79,143,255,0.05)', borderLeft: `3px solid ${C.blue}`, borderRadius: 6, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: '0.85rem', color: C.text }}>{r.title}</div>
              <div style={{ fontSize: '0.78rem', color: C.muted, lineHeight: 1.55, marginTop: 3 }}>{r.description}</div>
            </div>
          ))}
        </>}

        {/* OPERACIONES RELACIONADAS */}
        {data.relatedTrades.length > 0 && <>
          <SectionLabel>Operaciones relacionadas</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.relatedTrades.map(t => (
              <button key={t.id} onClick={() => setDetail(t)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: `1px solid ${C.border}`, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: BODY }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', color: C.text }}>{t.asset} <span style={{ color: t.direction === 'long' ? C.blue : C.red, fontSize: '0.7rem' }}>{t.direction.toUpperCase()}</span></div>
                  <div style={{ fontSize: '0.66rem', color: C.muted }}>{t.date} · {t.time}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: '0.85rem', color: t.pnl >= 0 ? C.blue : C.red }}>{t.pnl >= 0 ? '+' : '-'}{sym}{Math.abs(Math.round(t.pnl)).toLocaleString('en-US')}</div>
                  <div style={{ fontSize: '0.64rem', color: C.muted }}>{(t.realRR || 0).toFixed(1)}R</div>
                </div>
              </button>
            ))}
          </div>
          <button onClick={applyFilter} style={{ marginTop: 12, background: 'transparent', border: 'none', color: C.blue, cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600, padding: 0, fontFamily: BODY }}>Ver todas en Operaciones →</button>
        </>}

        {/* ACCIONES */}
        <SectionLabel>Acciones</SectionLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {data.filter && <ActionBtn onClick={applyFilter}>Filtrar por esto</ActionBtn>}
          <ActionBtn onClick={createNote}>Crear nota</ActionBtn>
          <ActionBtn onClick={share} disabled={busy}>{busy ? 'Generando…' : 'Compartir →'}</ActionBtn>
        </div>
      </div>

      {detail && <TradeDetailModal trade={detail} onClose={() => setDetail(null)} />}
      <style>{`@keyframes insightSlide{from{transform:translateX(100%)}to{transform:translateX(0)}}@keyframes insightFade{from{opacity:0}to{opacity:1}}`}</style>
    </>
  );
}

function ActionBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, borderRadius: 8, padding: '8px 14px', fontSize: '0.76rem', cursor: disabled ? 'default' : 'pointer', fontFamily: BODY, opacity: disabled ? 0.6 : 1 }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{children}</button>
  );
}

export default ChartInsightPanel;

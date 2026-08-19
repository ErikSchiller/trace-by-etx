import { useEffect, useMemo, useState } from 'react';
import { useUserTrades, type Trade } from '../../store/tradeStore';
import { useUserNotes } from '../../store/notebookStore';
import { useRoutineStore } from '../../store/routineStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useToast } from '../UI/ToastProvider';
import { TradeDetailModal } from '../Modals/TradeDetailModal';
import { computeWeeklyRecap, type RecapData } from '../../utils/recap';
import { copyRecapImage, shareRecapImage, downloadRecapPdf } from '../../utils/recapImage';
import { playSound } from '../../utils/sounds';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '16px 18px' };
const lab: React.CSSProperties = { fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 };

function money(n: number) {
  if (!isFinite(n)) return '$0';
  const s = n >= 0 ? '+' : '-';
  return `${s}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fmtDate(iso: string) { const [, m, d] = iso.split('-'); return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]}`; }
function weekday(iso: string) { return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][new Date(`${iso}T00:00:00`).getDay()]; }

export function WeeklyRecapModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const trades = useUserTrades();
  const notes = useUserNotes();
  const routine = useRoutineStore(s => s.routine);
  const completions = useRoutineStore(s => s.completions);
  const beCountsAsWin = useSettingsStore(s => s.beCountsAsWin);
  const { push } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [detailTrade, setDetailTrade] = useState<Trade | null>(null);

  const data = useMemo<RecapData | null>(
    () => (open ? computeWeeklyRecap({ trades, notes, routine, completions, beCountsAsWin }) : null),
    [open, trades, notes, routine, completions, beCountsAsWin]
  );

  useEffect(() => { if (open) playSound('success'); }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !data) return null;

  const run = async (kind: string, fn: () => Promise<unknown>, okMsg: (r: unknown) => string) => {
    setBusy(kind);
    try { const r = await fn(); push({ kind: 'success', text: okMsg(r) }); }
    catch { push({ kind: 'error', text: 'No se pudo generar la imagen' }); }
    finally { setBusy(null); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg2)', border: '1px solid var(--border-subtle)', borderRadius: 16, width: '100%', maxWidth: 720, fontFamily: fontBody, color: 'var(--text-primary)', boxShadow: '0 30px 80px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '22px 26px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(135deg, rgba(79,143,255,0.08), transparent)' }}>
          <div>
            <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Tu semana — {fmtDate(data.fromDate)} a {fmtDate(data.toDate)}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>{data.tradingDays} días operados · {data.totalTrades} operaciones</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 30, height: 30, borderRadius: 7, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* 1 — hero */}
          <div style={{ ...card, gridColumn: '1 / -1', background: 'linear-gradient(135deg, rgba(79,143,255,0.06), var(--card) 60%)' }}>
            <div style={lab}>Net PnL de la semana</div>
            <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2rem', color: data.netPnl >= 0 ? 'var(--blue)' : 'var(--red)', marginTop: 6 }}>{money(data.netPnl)}</div>
            {data.deltaPct !== null && (
              <div style={{ fontSize: '0.75rem', marginTop: 4, color: data.deltaPct >= 0 ? 'var(--blue)' : 'var(--red)' }}>
                {data.deltaPct >= 0 ? '↗' : '↘'} {data.deltaPct >= 0 ? '+' : ''}{data.deltaPct.toFixed(1)}% vs semana anterior
              </div>
            )}
            {data.deltaPct === null && <div style={{ fontSize: '0.72rem', marginTop: 4, color: 'var(--text-muted)' }}>Sin datos de la semana anterior</div>}
          </div>

          {/* 2 — best trade */}
          <TradeCard title="Tu mejor trade" trade={data.bestTrade} color="var(--blue)" onOpen={setDetailTrade} />
          {/* 3 — worst trade */}
          <TradeCard title="Tu peor trade" trade={data.worstTrade} color="var(--red)" onOpen={setDetailTrade} />

          {/* 4 — best day */}
          <DayCard title="Día más productivo" day={data.bestDay} color="var(--blue)" />
          {/* 5 — worst day */}
          <DayCard title="Día más difícil" day={data.worstDay} color="var(--red)" />

          {/* 6 — ratios */}
          <div style={{ ...card, gridColumn: '1 / -1' }}>
            <div style={{ ...lab, marginBottom: 12 }}>Ratios de la semana</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <Ratio label="Win rate" value={`${Math.round(data.winRate)}%`} />
              <Ratio label="Profit factor" value={isFinite(data.profitFactor) ? data.profitFactor.toFixed(2) : '∞'} />
              <Ratio label="Avg W/L" value={data.avgWL.toFixed(2)} />
              <Ratio label="Total trades" value={String(data.totalTrades)} />
            </div>
          </div>

          {/* 7 — behavior */}
          {data.insights.length > 0 && (
            <div style={{ ...card, gridColumn: '1 / -1' }}>
              <div style={{ ...lab, marginBottom: 10 }}>Comportamiento</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.insights.map((ins, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--blue)' }}>•</span>{ins}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8 — routine heatmap */}
          {data.routineTotal > 0 && (
            <div style={{ ...card, gridColumn: '1 / -1' }}>
              <div style={{ ...lab, marginBottom: 12 }}>Rutina de la semana</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                {data.days.map(d => {
                  const ratio = data.routineTotal ? d.routineDone / data.routineTotal : 0;
                  const bg = ratio === 0 ? 'var(--border)' : ratio < 0.5 ? 'rgba(79,143,255,0.25)' : ratio < 1 ? 'rgba(79,143,255,0.55)' : 'var(--blue)';
                  return (
                    <div key={d.date} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>{weekday(d.date)}</div>
                      <div style={{ height: 40, borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: ratio >= 0.5 ? '#fff' : 'var(--text-secondary)' }}>
                        {d.routineDone}/{data.routineTotal}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '16px 22px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <FooterBtn onClick={() => run('img', () => copyRecapImage(data), r => r === 'copied' ? 'Imagen copiada' : 'Imagen descargada')} busy={busy === 'img'} label="Copiar como imagen" />
          <FooterBtn onClick={() => run('pdf', () => downloadRecapPdf(data), () => 'Abriendo vista de impresión…')} busy={busy === 'pdf'} label="Descargar PDF" />
          <FooterBtn primary onClick={() => run('share', () => shareRecapImage(data), r => r === 'shared' ? 'Compartido' : r === 'copied' ? 'Imagen copiada' : 'Imagen descargada')} busy={busy === 'share'} label="Compartir" />
        </div>
      </div>

      <TradeDetailModal trade={detailTrade} onClose={() => setDetailTrade(null)} />
    </div>
  );
}

function FooterBtn({ label, onClick, busy, primary }: { label: string; onClick: () => void; busy?: boolean; primary?: boolean }) {
  return (
    <button onClick={onClick} disabled={busy} style={{
      background: primary ? 'var(--blue)' : 'transparent', color: primary ? '#fff' : 'var(--text-secondary)',
      border: primary ? 'none' : '1px solid var(--border-subtle)', borderRadius: 8, padding: '9px 16px',
      fontSize: '0.8rem', fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: fontBody,
    }}>{busy ? '…' : label} {primary ? '→' : ''}</button>
  );
}

function TradeCard({ title, trade, color, onOpen }: { title: string; trade: Trade | null; color: string; onOpen: (t: Trade) => void }) {
  return (
    <div style={card}>
      <div style={lab}>{title}</div>
      {!trade ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 10 }}>Sin operaciones</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{trade.asset} <span style={{ fontSize: '0.7rem', color: trade.direction === 'long' ? 'var(--blue)' : 'var(--red)' }}>{trade.direction === 'long' ? 'LONG' : 'SHORT'}</span></span>
            <span style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.1rem', color }}>{money(trade.pnl)}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{trade.setup || 'Sin setup'} · {fmtDate(trade.date)}</div>
          <span onClick={() => onOpen(trade)} style={{ fontSize: '0.7rem', color: 'var(--blue)', cursor: 'pointer', display: 'inline-block', marginTop: 8 }}>Ver detalles →</span>
        </>
      )}
    </div>
  );
}

function DayCard({ title, day, color }: { title: string; day: { date: string; pnl: number; count: number } | null; color: string }) {
  return (
    <div style={card}>
      <div style={lab}>{title}</div>
      {!day ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 10 }}>Sin operaciones</div>
      ) : (
        <>
          <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginTop: 8 }}>{weekday(day.date)} {fmtDate(day.date)}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.1rem', color }}>{money(day.pnl)}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{day.count} {day.count === 1 ? 'op' : 'ops'}</span>
          </div>
        </>
      )}
    </div>
  );
}

function Ratio({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.3rem', color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default WeeklyRecapModal;

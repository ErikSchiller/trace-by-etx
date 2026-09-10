import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWinRate, getProfitFactor, getCumulativePnL, type Trade } from '../../store/tradeStore';
import type { PropFirmAccount } from '../../store/propFirmStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useInsightPanel } from '../../store/insightPanelStore';
import { Watermark } from '../../components/UI/Watermark';
import { LineChart } from '../../components/Charts/LineChart';
import { AnimatedNumber } from '../../components/UI/AnimatedNumber';
import { generateInsights, pickTopInsights, type Insight, type InsightTab } from '../../utils/reportInsights';
import {
  card, label, fontHead, fontBody, fmt, pnlColor,
  Sparkline, equityPoints, expectancyR,
} from './shared';

interface Props {
  trades: Trade[];
  prevTrades: Trade[] | null;
  compareOn: boolean;
  accounts: PropFirmAccount[];
  onTab: (t: InsightTab) => void;
}

function deltaPct(cur: number, prev: number | undefined): number | null {
  if (prev === undefined || prev === 0 || !isFinite(prev) || !isFinite(cur)) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}
function DeltaChip({ d, unit }: { d: number | null; unit?: string }) {
  if (d === null) return <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>sin comparación</span>;
  const pos = d >= 0;
  return <span style={{ fontSize: '0.65rem', color: pos ? 'var(--blue)' : 'var(--red)' }}>{pos ? '↗' : '↘'} {pos ? '+' : ''}{d.toFixed(1)}{unit ?? '%'}</span>;
}

export function Overview({ trades, prevTrades, compareOn, accounts, onTab }: Props) {
  const navigate = useNavigate();
  const beCountsAsWin = useSettingsStore(s => s.beCountsAsWin);

  const s = useMemo(() => ({
    cum: getCumulativePnL(trades), n: trades.length,
    wr: getWinRate(trades, beCountsAsWin), pf: getProfitFactor(trades),
  }), [trades, beCountsAsWin]);
  const prev = useMemo(() => prevTrades ? {
    cum: getCumulativePnL(prevTrades), n: prevTrades.length,
    wr: getWinRate(prevTrades, beCountsAsWin), pf: getProfitFactor(prevTrades),
  } : null, [prevTrades, beCountsAsWin]);
  const showDelta = compareOn && prev !== null;

  const insights = useMemo(() => generateInsights(trades, accounts), [trades, accounts]);
  const [showAll, setShowAll] = useState(false);
  const top = useMemo(() => pickTopInsights(insights, 3), [insights]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Hero KPI cards */}
      <div className="rep-hero" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <HeroCard title="Net PnL total" valueEl={<span style={{ ...big3, color: pnlColor(s.cum) }}><AnimatedNumber value={s.cum} format={fmt} /></span>} delta={showDelta ? <DeltaChip d={deltaPct(s.cum, prev?.cum)} /> : null} trades={trades} />
        <HeroCard title="Profit factor" valueEl={<span style={big3}><AnimatedNumber value={s.pf} format={n => isFinite(n) ? n.toFixed(2) : '∞'} /></span>} delta={showDelta ? <DeltaChip d={deltaPct(isFinite(s.pf) ? s.pf : 0, prev && isFinite(prev.pf) ? prev.pf : undefined)} /> : null} trades={trades} />
        <HeroCard title="Win rate global" valueEl={<span style={big3}><AnimatedNumber value={s.wr} format={n => `${n.toFixed(0)}%`} /></span>} delta={showDelta ? <DeltaChip d={prev ? s.wr - prev.wr : null} unit="pp" /> : null} trades={trades} />
        <HeroCard title="Total operaciones" valueEl={<span style={big3}><AnimatedNumber value={s.n} format={n => String(Math.round(n))} /></span>} delta={showDelta ? <DeltaChip d={deltaPct(s.n, prev?.n)} /> : null} trades={trades} />
      </div>

      {/* Insights panel */}
      <div style={{ background: 'linear-gradient(135deg, rgba(120,97,255,0.05), rgba(120,97,255,0.01))', border: '1px solid rgba(120,97,255,0.15)', borderRadius: 12, padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>💡 Insights automáticos</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Basado en tus últimos {trades.length} trades</div>
        </div>
        {top.length === 0 ? (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '6px 0' }}>Sigue registrando operaciones para desbloquear insights automáticos.</div>
        ) : (
          <>
            <div className="rep-insights" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, top.length)}, 1fr)`, gap: 12 }}>
              {top.map(ins => <InsightCard key={ins.id} ins={ins} onTab={onTab} onHref={h => navigate(h)} />)}
            </div>
            {insights.length > top.length && (
              <div style={{ marginTop: 12 }}>
                <button onClick={() => setShowAll(v => !v)} style={{ background: 'transparent', border: 'none', color: 'var(--blue)', fontSize: '0.72rem', cursor: 'pointer', fontFamily: fontBody, fontWeight: 600 }}>
                  {showAll ? 'Ocultar' : `Ver todos los insights (${insights.length}) →`}
                </button>
                {showAll && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginTop: 10 }}>
                    {insights.slice(top.length).map(ins => <InsightCard key={ins.id} ins={ins} onTab={onTab} onHref={h => navigate(h)} />)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Evolución temporal */}
      <div className="rep-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={card}>
          <div style={label}>Equity acumulada</div>
          <LineChart
            data={equityPoints(trades).map(p => ({ value: p.value }))}
            overlay={compareOn && prevTrades ? equityPoints(prevTrades).map(p => ({ value: p.value })) : undefined}
            height={200} showGrid showPeak />
          <Watermark />
        </div>
        <MonthlyBars trades={trades} />
      </div>

      {/* Distribución de resultados */}
      <div className="rep-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <WinLossCard trades={trades} beCountsAsWin={beCountsAsWin} />
        <RDistributionCard trades={trades} />
        <ConsecutiveCard trades={trades} />
      </div>

      <style>{`
        @media (max-width: 900px) {
          .rep-hero { grid-template-columns: repeat(2, 1fr) !important; }
          .rep-insights { grid-template-columns: 1fr !important; }
          .rep-2col, .rep-3col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

const big3: React.CSSProperties = { fontFamily: fontHead, fontWeight: 800, fontSize: '1.4rem', color: '#fff', lineHeight: 1 };

function HeroCard({ title, valueEl, delta, trades }: { title: string; valueEl: React.ReactNode; delta: React.ReactNode; trades: Trade[] }) {
  return (
    <div style={card}>
      <div style={label}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        {valueEl}{delta}
      </div>
      <Sparkline trades={trades} />
      <Watermark />
    </div>
  );
}

function InsightCard({ ins, onTab, onHref }: { ins: Insight; onTab: (t: InsightTab) => void; onHref: (h: string) => void }) {
  return (
    <div style={{ background: '#15171d', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', border: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{ins.emoji}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>{ins.title}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 3 }}>{ins.description}</div>
        {(ins.actionTab || ins.actionHref) && (
          <button onClick={() => { if (ins.actionHref) onHref(ins.actionHref); else if (ins.actionTab) onTab(ins.actionTab); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--blue)', fontSize: '0.7rem', cursor: 'pointer', padding: 0, marginTop: 8, fontFamily: fontBody }}>
            {ins.actionLabel ?? 'Ver más'} →
          </button>
        )}
      </div>
    </div>
  );
}

function MonthlyBars({ trades }: { trades: Trade[] }) {
  const months = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const t of trades) { const m = t.date.slice(0, 7); byMonth.set(m, (byMonth.get(m) || 0) + t.pnl); }
    return [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [trades]);
  const maxAbs = Math.max(...months.map(([, v]) => Math.abs(v)), 1);
  return (
    <div style={card}>
      <div style={label}>PnL mensual</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 200, paddingTop: 10, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'var(--border-subtle)' }} />
        {months.map(([m, v]) => {
          const h = (Math.abs(v) / maxAbs) * 80;
          return (
            <div key={m} onClick={() => useInsightPanel.getState().open({ type: 'month', value: m })} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', cursor: 'pointer' }} title={`${m}: ${fmt(v)}`}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: v >= 0 ? 'flex-end' : 'flex-start', height: '50%', width: '100%', alignItems: 'center' }}>
                {v >= 0 && <div style={{ width: '60%', maxWidth: 40, height: `${h}%`, background: 'var(--blue)', borderRadius: '4px 4px 0 0' }} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', height: '50%', width: '100%', alignItems: 'center' }}>
                {v < 0 && <div style={{ width: '60%', maxWidth: 40, height: `${h}%`, background: 'var(--red)', borderRadius: '0 0 4px 4px' }} />}
                <div style={{ fontSize: 9, color: '#4a4a60', marginTop: 3 }}>{m.slice(5)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <Watermark />
    </div>
  );
}

function WinLossCard({ trades, beCountsAsWin }: { trades: Trade[]; beCountsAsWin: boolean }) {
  const wins = trades.filter(t => t.pnl > 0).length;
  const losses = trades.filter(t => t.pnl < 0).length;
  const be = trades.length - wins - losses;
  const exp = expectancyR(trades);
  void beCountsAsWin;
  return (
    <div style={card}>
      <div style={label}>Distribución W / L / BE</div>
      <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', margin: '12px 0' }}>
        <div style={{ flex: Math.max(0.02, wins), background: 'var(--blue)' }} />
        <div style={{ flex: Math.max(0.02, losses), background: 'var(--red)' }} />
        <div style={{ flex: Math.max(0.02, be), background: '#33334a' }} />
      </div>
      <div style={{ fontSize: 12, color: '#888898' }}>
        <span style={{ color: 'var(--blue)' }}>{wins} winners</span> · <span style={{ color: 'var(--red)' }}>{losses} losers</span> · {be} BE
      </div>
      <div style={{ marginTop: 12, fontSize: '0.72rem', color: 'var(--text-muted)' }}>Expectancy: <b style={{ color: pnlColor(exp) }}>{exp >= 0 ? '+' : ''}{exp.toFixed(2)}R</b></div>
      <Watermark />
    </div>
  );
}

const R_BUCKETS = [-3, -2, -1, 0, 1, 2, 3];
function RDistributionCard({ trades }: { trades: Trade[] }) {
  const counts = useMemo(() => {
    const c = new Array(R_BUCKETS.length).fill(0);
    for (const t of trades) {
      const r = t.realRR || (t.pnl > 0 ? 1 : t.pnl < 0 ? -1 : 0);
      let idx = R_BUCKETS.findIndex(b => r < b + 0.5 && r >= b - 0.5);
      if (r >= 2.5) idx = R_BUCKETS.length - 1;
      if (r < -2.5) idx = 0;
      if (idx < 0) idx = 3;
      c[idx] += 1;
    }
    return c;
  }, [trades]);
  const max = Math.max(...counts, 1);
  const rMean = expectancyR(trades);
  return (
    <div style={card}>
      <div style={label}>Distribución de R</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90, marginTop: 8 }}>
        {counts.map((c, i) => (
          <div key={i} onClick={() => c && useInsightPanel.getState().open({ type: 'rbucket', value: R_BUCKETS[i] })} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', cursor: c ? 'pointer' : 'default' }} title={`${c} trades`}>
            <div style={{ width: '70%', height: `${Math.max(3, (c / max) * 78)}px`, background: R_BUCKETS[i] < 0 ? 'var(--red)' : R_BUCKETS[i] === 0 ? '#33334a' : 'var(--blue)', borderRadius: '3px 3px 0 0' }} />
            <div style={{ fontSize: 8, color: '#4a4a60', marginTop: 3 }}>{R_BUCKETS[i] === 3 ? '3+' : `${R_BUCKETS[i]}`}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: '0.72rem', color: rMean >= 0 ? 'var(--blue)' : 'var(--red)' }}>{rMean >= 0 ? 'Sesgo positivo' : 'Sesgo negativo'} · media {rMean.toFixed(2)}R</div>
      <Watermark />
    </div>
  );
}

function ConsecutiveCard({ trades }: { trades: Trade[] }) {
  const s = useMemo(() => {
    const sorted = [...trades].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    let bw = 0, bl = 0, cw = 0, cl = 0;
    for (const t of sorted) {
      if (t.pnl > 0) { cw++; cl = 0; bw = Math.max(bw, cw); }
      else if (t.pnl < 0) { cl++; cw = 0; bl = Math.max(bl, cl); }
    }
    let cur = 0; let type: 'win' | 'loss' | null = null;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].pnl === 0) break;
      const ty = sorted[i].pnl > 0 ? 'win' : 'loss';
      if (type === null) type = ty;
      if (ty !== type) break;
      cur++;
    }
    return { bw, bl, cur, type };
  }, [trades]);
  return (
    <div style={card}>
      <div style={label}>Rachas consecutivas</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
        <Row l="Racha ganadora más larga" v={`${s.bw}`} c="var(--blue)" />
        <Row l="Racha perdedora más larga" v={`${s.bl}`} c="var(--red)" />
        <Row l="Racha actual" v={`${s.cur} ${s.type === 'win' ? 'W' : s.type === 'loss' ? 'L' : ''}`} c={s.type === 'win' ? 'var(--blue)' : s.type === 'loss' ? 'var(--red)' : '#fff'} />
      </div>
      <Watermark />
    </div>
  );
}
function Row({ l, v, c }: { l: string; v: string; c: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{l}</span>
      <span style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.1rem', color: c }}>{v}</span>
    </div>
  );
}

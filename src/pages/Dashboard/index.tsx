import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useFilteredTrades, usePreviousPeriodTrades,
  getCumulativePnL, getWinRate, getProfitFactor, getDayWinRate,
  getAvgWin, getAvgLoss, getEquityCurve, getRecentTrades, getTraceScore,
  getMonthlyPnL,
} from '../../store/tradeStore';
import { useDateRangeStore, COMPARE_LABEL } from '../../store/dateRangeStore';
import { Watermark } from '../../components/UI/Watermark';
import { AnimatedNumber } from '../../components/UI/AnimatedNumber';
import { RecapPrompt } from '../../components/WeeklyRecap/RecapPrompt';
import { tradingDaysLast7 } from '../../utils/recap';
import { ProLock } from '../../components/UI/ProLock';
import { LineChart } from '../../components/Charts/LineChart';
import { TraceScorePanel } from '../../components/Dashboard/TraceScorePanel';
import { EquityCurvePanel } from '../../components/Dashboard/EquityCurvePanel';
import { PRESET_LABEL } from '../../store/dateRangeStore';
import { TradeDetailModal } from '../../components/Modals/TradeDetailModal';
import { AiWaitlistModal } from '../../components/UI/AiWaitlistModal';
import { hasJoinedAiWaitlist } from '../../config/tracer-ai-content';
import { usePlan } from '../../hooks/usePlan';
import { useSettingsStore } from '../../store/settingsStore';
import { getDailyPnL } from '../../store/tradeStore';
import {
  useUserAccounts, getActiveAccounts, computeAccountStatus, getAccountAlerts,
  getAccountsGroupedByFirm,
  type PropFirmAccount, type FirmGroup,
} from '../../store/propFirmStore';

const card: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 12,
  padding: '18px 20px',
  position: 'relative',
  transition: 'border-color 0.15s ease',
};
const kpiCell: React.CSSProperties = {
  padding: '20px 24px',
  borderRight: '1px solid var(--border-subtle)',
  position: 'relative',
};
const kpiLabel: React.CSSProperties = {
  fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.08em',
  textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 500, marginBottom: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};
const kpiValue: React.CSSProperties = {
  fontFamily: "'Syne', sans-serif", fontSize: '1.5rem', fontWeight: 800,
  color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1,
};
const kpiSub: React.CSSProperties = {
  fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 5,
  fontFamily: "'Space Grotesk', sans-serif",
};
function fmtMoney(n: number, sym = '$') {
  if (!isFinite(n)) return `${sym}0`;
  const sign = n >= 0 ? '+' : '-';
  return `${sign}${sym}${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}
/** Compact signed money for calendar cells: "-$1.2K" / "$340". */
function fmtCompact(n: number, sym = '$') {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1000) return `${sign}${sym}${(abs / 1000).toFixed(1)}K`;
  return `${sign}${sym}${Math.round(abs)}`;
}
/** Win rate as "100%" or "66.7%". */
function fmtWinRate(wins: number, count: number) {
  if (count === 0) return '0%';
  const wr = (wins / count) * 100;
  return wr === 100 ? '100%' : `${wr.toFixed(1)}%`;
}

type DeltaMode = 'pct' | 'pp' | 'abs';
function formatDelta(cur: number, prev: number | undefined, mode: DeltaMode): { text: string; positive: boolean } | null {
  if (prev === undefined) return null;
  if (mode === 'pct') {
    if (prev === 0 || !isFinite(prev) || !isFinite(cur)) return null;
    const d = ((cur - prev) / Math.abs(prev)) * 100;
    return { text: `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`, positive: d >= 0 };
  }
  if (mode === 'pp') {
    const d = cur - prev;
    return { text: `${d >= 0 ? '+' : ''}${Math.round(d)}pp`, positive: d >= 0 };
  }
  if (!isFinite(cur) || !isFinite(prev)) return null;
  const d = cur - prev;
  return { text: `${d >= 0 ? '+' : ''}${d.toFixed(2)}`, positive: d >= 0 };
}

function Delta({ res, label }: { res: { text: string; positive: boolean } | null; label?: string }) {
  if (res === null) return <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 5 }}>— sin datos anteriores</div>;
  const color = res.positive ? 'var(--blue)' : 'var(--red)';
  return <div style={{ fontSize: '0.65rem', color, marginTop: 5, fontFamily: "'Space Grotesk', sans-serif" }}>{res.positive ? '↗' : '↘'} {res.text} vs {label}</div>;
}

function Sparkline({ points }: { points: { date: string; cumPnl: number }[] }) {
  if (points.length < 2) return <div style={{ height: 28, marginTop: 6 }} />;
  return (
    <div style={{ marginTop: 6 }}>
      <LineChart data={points.map(p => ({ value: p.cumPnl }))} height={28} showGrid={false} showPeak={false} />
    </div>
  );
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function Dashboard() {
  const navigate = useNavigate();
  const trades = useFilteredTrades();
  const empty = trades.length === 0;
  const beCountsAsWin = useSettingsStore(s => s.beCountsAsWin);

  // KPI calculations (memoized)
  const stats = useMemo(() => {
    const cum = getCumulativePnL(trades);
    const wr = getWinRate(trades, beCountsAsWin);
    const pf = getProfitFactor(trades);
    const dwr = getDayWinRate(trades);
    const aw = getAvgWin(trades);
    const al = Math.abs(getAvgLoss(trades));
    const wins = trades.filter(t => t.pnl > 0).length;
    const losses = trades.filter(t => t.pnl < 0).length;
    const be = trades.filter(t => t.pnl === 0).length;
    const ratio = al > 0 ? aw / al : (aw > 0 ? aw : 0);
    const score = getTraceScore(trades);
    const equity = getEquityCurve(trades);
    const recent = getRecentTrades(trades, 5);

    // breakdown for radar (0..1 each)
    const winRateNorm = wr / 100;
    const pfNorm = isFinite(pf) ? Math.min(pf / 3, 1) : 1;
    const ratioNorm = al > 0 ? Math.min(aw / al / 2, 1) : (aw > 0 ? 1 : 0);
    const dd = (() => {
      let peak = 0, c = 0, mdd = 0;
      const sorted = [...trades].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      for (const t of sorted) { c += t.pnl; peak = Math.max(peak, c); mdd = Math.min(mdd, c - peak); }
      return Math.abs(mdd);
    })();
    const recoveryNorm = dd === 0 ? (cum > 0 ? 1 : 0) : Math.min(Math.max(cum / dd, 0) / 3, 1);
    const ddNorm = dd === 0 ? 1 : Math.max(0, 1 - dd / Math.max(cum, 1));
    const consistencyNorm = (() => {
      const byDay: Record<string, number> = {};
      trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl; });
      const v = Object.values(byDay);
      if (v.length === 0) return 0;
      const m = v.reduce((s, x) => s + x, 0) / v.length;
      const variance = v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length;
      return Math.max(0, 1 - Math.sqrt(variance) / (Math.abs(m) * 4 + 1));
    })();

    return {
      cum, wr, pf, dwr, aw, al, ratio, wins, losses, be, score, equity, recent,
      breakdown: [winRateNorm, pfNorm, ratioNorm, recoveryNorm, ddNorm, consistencyNorm],
    };
  }, [trades, beCountsAsWin]);

  // Period comparison
  const prevTrades = usePreviousPeriodTrades();
  const preset = useDateRangeStore(s => s.preset);
  const compareLabel = COMPARE_LABEL[preset];
  const [compareOn, setCompareOn] = useState(() => localStorage.getItem('dash_compare') !== '0');
  const toggleCompare = () => setCompareOn(v => { const n = !v; localStorage.setItem('dash_compare', n ? '1' : '0'); return n; });
  const prevStats = useMemo(() => {
    if (!prevTrades) return null;
    const aw = getAvgWin(prevTrades); const al = Math.abs(getAvgLoss(prevTrades));
    return {
      cum: getCumulativePnL(prevTrades),
      wr: getWinRate(prevTrades, beCountsAsWin),
      pf: getProfitFactor(prevTrades),
      dwr: getDayWinRate(prevTrades),
      ratio: al > 0 ? aw / al : (aw > 0 ? aw : 0),
      equity: getEquityCurve(prevTrades),
      count: prevTrades.length,
    };
  }, [prevTrades, beCountsAsWin]);
  const canCompare = compareOn && prevStats !== null && !!compareLabel;

  // Plan + loss-limit alert + trade counter for free users
  const { isFree } = usePlan();
  const dailyLossLimit = useSettingsStore(s => s.dailyLossLimit);
  const currencySymbol = useSettingsStore(s => s.currencySymbol);
  const accountSize = useSettingsStore(s => s.accountSize);
  // Trader-facing money formatters bound to the current currency (reactive).
  const money = (n: number) => fmtMoney(n, currencySymbol);
  const moneyC = (n: number) => fmtCompact(n, currencySymbol);
  // Return over configured account size (updates live when account size changes).
  const returnPct = accountSize > 0 ? (stats.cum / accountSize) * 100 : 0;
  const today = new Date().toISOString().slice(0, 10);
  const todayPnl = getDailyPnL(trades, today);
  const lossSeverity: 'over' | 'near' | 'ok' =
    todayPnl <= -dailyLossLimit ? 'over'
    : todayPnl <= -(dailyLossLimit * 0.8) && todayPnl < 0 ? 'near'
    : 'ok';
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return trades.filter(t => t.date.startsWith(key)).length;
  }, [trades]);

  // Calendar
  const [detailId, setDetailId] = useState<string | null>(null);
  const [aiWaitlistOpen, setAiWaitlistOpen] = useState(false);
  const [aiTeaserHidden, setAiTeaserHidden] = useState(() => localStorage.getItem('dismissed_ai_teaser') === '1' || hasJoinedAiWaitlist());
  const dismissAiTeaser = () => { localStorage.setItem('dismissed_ai_teaser', '1'); setAiTeaserHidden(true); };
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const monthly = useMemo(() => getMonthlyPnL(trades, calMonth.y, calMonth.m), [trades, calMonth]);
  const monthLabel = `${MONTH_NAMES[calMonth.m]} ${calMonth.y}`;

  // Per-day aggregates (pnl / count / wins) for the visible month, plus a
  // Monday-first 6-row grid including adjacent-month days.
  const cal = useMemo(() => {
    const prefix = `${calMonth.y}-${String(calMonth.m + 1).padStart(2, '0')}`;
    const byDay: Record<string, { pnl: number; count: number; wins: number }> = {};
    for (const t of trades) {
      if (!t.date.startsWith(prefix)) continue;
      const e = byDay[t.date] ?? { pnl: 0, count: 0, wins: 0 };
      e.pnl += t.pnl; e.count += 1; if (t.pnl > 0) e.wins += 1;
      byDay[t.date] = e;
    }
    const maxAbs = Math.max(1, ...Object.values(byDay).map(d => Math.abs(d.pnl)));
    const first = new Date(calMonth.y, calMonth.m, 1);
    const lead = (first.getDay() + 6) % 7; // Monday-first offset
    const start = new Date(calMonth.y, calMonth.m, 1 - lead);
    const cells: { date: Date; key: string; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      cells.push({ date: d, key, inMonth: d.getMonth() === calMonth.m });
    }
    return { byDay, maxAbs, cells, daysTraded: Object.keys(byDay).length };
  }, [trades, calMonth]);
  const todayKey = new Date().toISOString().slice(0, 10);

  // Best/worst day (visible month) + trailing profitable-day streak (all trades).
  const calSummary = useMemo(() => {
    let best: { key: string; pnl: number } | null = null;
    let worst: { key: string; pnl: number } | null = null;
    for (const [key, d] of Object.entries(cal.byDay)) {
      if (!best || d.pnl > best.pnl) best = { key, pnl: d.pnl };
      if (!worst || d.pnl < worst.pnl) worst = { key, pnl: d.pnl };
    }
    const byDayAll = new Map<string, number>();
    for (const t of trades) byDayAll.set(t.date, (byDayAll.get(t.date) || 0) + t.pnl);
    const days = [...byDayAll.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) { if (days[i][1] > 0) streak += 1; else break; }
    return { best, worst, streak };
  }, [cal, trades]);

  if (empty) {
    return (
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ ...card, padding: 40, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: '#fff', marginBottom: 8 }}>
            Aún no tienes operaciones registradas
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 18 }}>
            Empieza añadiendo tu primera operación para ver tus métricas en vivo.
          </div>
          <button
            onClick={() => {
              // Trigger sidebar Add Trade by dispatching event
              window.dispatchEvent(new CustomEvent('trace:open-add-trade'));
            }}
            style={{ background: '#4f8fff', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            ＋ Añadir tu primera operación
          </button>
        </div>
        {/* Empty KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {['Net PnL', 'Trade Win %', 'Profit Factor', 'Day Win %', 'Avg Win / Loss'].map(l => (
            <div key={l} style={card}>
              <div style={kpiLabel}>{l}</div>
              <div style={{ ...kpiValue, color: 'var(--muted)' }}>—</div>
              <div style={kpiSub}>Sin datos</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Daily loss alert */}
      {lossSeverity !== 'ok' && (
        <div style={{
          background: lossSeverity === 'over' ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
          borderBottom: `1px solid ${lossSeverity === 'over' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}`,
          padding: '10px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          color: lossSeverity === 'over' ? 'var(--red)' : 'var(--warning)', fontSize: 13,
        }}>
          <span>
            {lossSeverity === 'over'
              ? `⚠️ Has alcanzado tu límite de pérdida diaria (${currencySymbol}${dailyLossLimit}). Considera cerrar tus operaciones por hoy.`
              : `Estás cerca de tu límite diario. PnL hoy: ${currencySymbol}${todayPnl.toFixed(0)} / Límite: -${currencySymbol}${dailyLossLimit}`}
          </span>
          <a
            onClick={() => navigate('/settings')}
            style={{ cursor: 'pointer', textDecoration: 'underline', color: 'inherit' }}
          >Ajustar límite →</a>
        </div>
      )}

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* TRACE IA teaser (dismissable) */}
      {!aiTeaserHidden && (
        <div style={{ background: 'linear-gradient(90deg, rgba(120,97,255,0.06), rgba(79,143,255,0.03))', border: '1px solid rgba(120,97,255,0.15)', borderRadius: 10, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(120,97,255,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 100 100" style={{ width: 13, height: 15, overflow: 'visible' }}><polyline points="10,90 50,10 90,90" stroke="#7861ff" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>🧠 TRACE IA llega este trimestre</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>Coach virtual, auto-review, insights personalizados. Incluida en Pro.</div>
          </div>
          <button onClick={() => setAiWaitlistOpen(true)} style={{ flexShrink: 0, background: 'transparent', color: '#7861ff', border: '1px solid rgba(120,97,255,0.35)', borderRadius: 8, padding: '7px 14px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>Unirme a la waitlist →</button>
          <button onClick={dismissAiTeaser} aria-label="Descartar" style={{ flexShrink: 0, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>✕</button>
        </div>
      )}
      {/* Weekly recap prompt — shown when the user has been active */}
      {tradingDaysLast7(trades) >= 3 && <RecapPrompt />}
      {/* Comparison toggle chip */}
      {compareLabel && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -6 }}>
          <button
            onClick={toggleCompare}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              background: compareOn ? 'rgba(79,143,255,0.08)' : 'transparent',
              border: `1px solid ${compareOn ? 'rgba(79,143,255,0.25)' : 'var(--border-subtle)'}`,
              color: compareOn ? 'var(--blue)' : 'var(--text-secondary)',
              borderRadius: 20, padding: '5px 12px', fontSize: '0.7rem', fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <span style={{ width: 14, height: 14, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, background: compareOn ? 'var(--blue)' : 'transparent', border: compareOn ? 'none' : '1px solid var(--border)', color: '#fff' }}>{compareOn ? '✓' : ''}</span>
            Comparar con periodo anterior
          </button>
        </div>
      )}
      {/* KPI STRIP — single horizontal card with 5 KPIs */}
      <div className="dash-kpi-strip" style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 12, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', position: 'relative' }}>
        <div style={kpiCell}>
          <div style={kpiLabel}><span>NET PNL</span><span style={{ color: '#2a2a35', fontSize: '0.6rem' }}>ⓘ</span></div>
          <div style={{ ...kpiValue, color: stats.cum >= 0 ? 'var(--blue)' : stats.cum < 0 ? 'var(--red)' : 'var(--text-primary)' }}><AnimatedNumber value={stats.cum} format={money} /></div>
          {canCompare && <Delta res={formatDelta(stats.cum, prevStats?.cum, 'pct')} label={compareLabel} />}
          <div style={kpiSub}>{trades.length} operaciones · <span style={{ color: returnPct >= 0 ? 'var(--blue)' : 'var(--red)' }}>{returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%</span> de cuenta</div>
          {isFree && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4a4a60', marginBottom: 4 }}>
                <span>{thisMonthCount} / 30 ops este mes</span>
                {thisMonthCount >= 30 && <span style={{ color: '#ef4444' }}>Límite alcanzado</span>}
              </div>
              <div style={{ height: 3, background: '#1e1e20', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, (thisMonthCount / 30) * 100)}%`,
                  height: '100%',
                  background: thisMonthCount >= 30 ? 'var(--red)' : thisMonthCount >= 25 ? 'var(--warning)' : 'var(--blue)',
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          )}
        </div>
        <div style={kpiCell}>
          <div style={kpiLabel}><span>TRADE WIN %</span><span style={{ color: '#2a2a35', fontSize: '0.6rem' }}>ⓘ</span></div>
          <div style={kpiValue}><AnimatedNumber value={stats.wr} format={n => `${n.toFixed(0)}%`} /></div>
          {canCompare && <Delta res={formatDelta(stats.wr, prevStats?.wr, 'pp')} label={compareLabel} />}
          <div style={kpiSub}>{stats.wins}W · {stats.be}BE · {stats.losses}L</div>
          <div style={{ display: 'flex', height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 8, background: 'var(--border)' }}>
            <div style={{ flex: Math.max(0.05, stats.wr / 100), background: 'var(--blue)' }} />
            <div style={{ flex: Math.max(0.05, (100 - stats.wr) / 100), background: 'var(--red)' }} />
          </div>
        </div>
        <div style={kpiCell}>
          <div style={kpiLabel}><span>PROFIT FACTOR</span><span style={{ color: '#2a2a35', fontSize: '0.6rem' }}>ⓘ</span></div>
          <div style={kpiValue}><AnimatedNumber value={stats.pf} format={n => isFinite(n) ? n.toFixed(2) : '∞'} /></div>
          {canCompare && <Delta res={formatDelta(stats.pf, prevStats?.pf, 'abs')} label={compareLabel} />}
          <div style={kpiSub}>Bruto / Pérdidas</div>
        </div>
        <div style={kpiCell}>
          <div style={kpiLabel}><span>DAY WIN %</span><span style={{ color: '#2a2a35', fontSize: '0.6rem' }}>ⓘ</span></div>
          <div style={kpiValue}><AnimatedNumber value={stats.dwr} format={n => `${n.toFixed(0)}%`} /></div>
          {canCompare && <Delta res={formatDelta(stats.dwr, prevStats?.dwr, 'pp')} label={compareLabel} />}
          <div style={kpiSub}>Días positivos</div>
          <div style={{ display: 'flex', height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 8, background: 'var(--border)' }}>
            <div style={{ flex: Math.max(0.05, stats.dwr / 100), background: 'var(--blue)' }} />
            <div style={{ flex: Math.max(0.05, (100 - stats.dwr) / 100), background: 'var(--red)' }} />
          </div>
        </div>
        <div style={{ ...kpiCell, borderRight: 'none' }}>
          <div style={kpiLabel}><span>AVG WIN / LOSS</span><span style={{ color: '#2a2a35', fontSize: '0.6rem' }}>ⓘ</span></div>
          <div style={kpiValue}><AnimatedNumber value={stats.ratio} format={n => n.toFixed(2)} /></div>
          {canCompare && <Delta res={formatDelta(stats.ratio, prevStats?.ratio, 'pct')} label={compareLabel} />}
          <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 8, marginBottom: 4 }}>
            <div style={{ flex: Math.max(0.1, stats.ratio / (stats.ratio + 1)), background: 'var(--blue)' }} />
            <div style={{ flex: Math.max(0.1, 1 / (stats.ratio + 1)), background: 'var(--red)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.62rem' }}>
            <span style={{ color: 'var(--blue)' }}>{money(stats.aw)}</span>
            <span style={{ color: '#4a4a60' }}>R:R medio: {stats.ratio.toFixed(1)}</span>
            <span style={{ color: 'var(--red)' }}>{money(-stats.al)}</span>
          </div>
        </div>
        <Watermark />
      </div>

      {/* ── MONTHLY CALENDAR — hero (main focal point) ── */}
      <div style={{ ...card, padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Calendario mensual</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: 'var(--muted)' }}>
              <span>Monthly stats:</span>
              <span style={{ background: monthly.pnl >= 0 ? 'rgba(79,143,255,0.12)' : 'rgba(239,68,68,0.12)', color: monthly.pnl >= 0 ? 'var(--blue)' : 'var(--red)', borderRadius: 20, padding: '4px 12px', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{money(monthly.pnl)}</span>
              <span style={{ background: 'rgba(255,255,255,0.05)', color: '#c8d4e8', borderRadius: 20, padding: '4px 12px', fontWeight: 600 }}>{cal.daysTraded} {cal.daysTraded === 1 ? 'día operado' : 'días operados'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setCalMonth(c => ({ y: c.m === 0 ? c.y - 1 : c.y, m: c.m === 0 ? 11 : c.m - 1 }))} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 }}>‹</button>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#fff', minWidth: 120, textAlign: 'center' }}>{monthLabel}</div>
              <button onClick={() => setCalMonth(c => ({ y: c.m === 11 ? c.y + 1 : c.y, m: c.m === 11 ? 0 : c.m + 1 }))} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 }}>›</button>
              <button onClick={() => { const d = new Date(); setCalMonth({ y: d.getFullYear(), m: d.getMonth() }); }} style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--blue)', fontSize: 10, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', marginLeft: 4 }}>Hoy</button>
            </div>
          </div>
        </div>
        {/* Weekday header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #1e2029', paddingBottom: 8, marginBottom: 6 }}>
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
            <div key={d} style={{ fontSize: '0.68rem', color: '#6b7280', textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d}</div>
          ))}
        </div>
        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cal.cells.map(({ date, key, inMonth }) => {
            const day = date.getDate();
            const isToday = key === todayKey;
            if (!inMonth) {
              return <div key={key} style={{ minHeight: 100, padding: '8px 10px', borderRadius: 8, border: '1px solid transparent', margin: 2 }}><span style={{ fontSize: '0.72rem', color: '#33334a' }}>{day}</span></div>;
            }
            const d = cal.byDay[key];
            const has = !!d;
            const pos = has && d.pnl > 0;
            const neg = has && d.pnl < 0;
            const be = has && d.pnl === 0;
            const mag = has ? 0.08 + (Math.abs(d.pnl) / cal.maxAbs) * 0.06 : 0;
            const bg = pos ? `rgba(79,143,255,${mag})` : neg ? `rgba(239,68,68,${mag})` : be ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)';
            const border = isToday ? '2px solid #4f8fff' : pos ? '1px solid rgba(79,143,255,0.2)' : neg ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.03)';
            const dotColor = pos ? '#4f8fff' : neg ? '#ef4444' : be ? 'rgba(255,255,255,0.4)' : '';
            return (
              <div
                key={key}
                onClick={() => has && navigate(`/journal?date=${key}`)}
                className={has ? 'cal-cell' : undefined}
                style={{
                  minHeight: 100, padding: '8px 10px', position: 'relative', borderRadius: 8, border, margin: 2,
                  background: bg, cursor: has ? 'pointer' : 'default',
                  display: 'flex', flexDirection: 'column', transition: 'transform 0.1s, border-color 0.1s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.72rem', color: has ? '#a1abbe' : '#4a4a60' }}>{day}</span>
                  {isToday && has && <span style={{ fontSize: 8, fontWeight: 700, color: '#4f8fff', background: 'rgba(79,143,255,0.15)', borderRadius: 4, padding: '1px 4px' }}>HOY</span>}
                </div>
                {has && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 2 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.15rem', color: pos ? '#4f8fff' : neg ? '#ef4444' : '#c8d4e8', lineHeight: 1 }}>{moneyC(d.pnl)}</div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--muted)' }}>{d.count} {d.count === 1 ? 'trade' : 'trades'}</div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--muted)' }}>{fmtWinRate(d.wins, d.count)}</div>
                  </div>
                )}
                {has && dotColor && <span style={{ position: 'absolute', bottom: 6, right: 6, width: 5, height: 5, borderRadius: '50%', background: dotColor }} />}
              </div>
            );
          })}
        </div>
        {monthly.trades === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0 4px', fontSize: '0.75rem', color: 'var(--muted)' }}>
            Este mes aún no tiene operaciones. <span onClick={() => window.dispatchEvent(new CustomEvent('trace:open-add-trade'))} style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}>Añade la primera →</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginTop: 14, paddingTop: 12, borderTop: '1px solid #1e2029', fontSize: '0.74rem', color: 'var(--muted)' }}>
            {calSummary.best && <span>Mejor día: <b style={{ color: 'var(--blue)' }}>{money(calSummary.best.pnl)}</b> el {calSummary.best.key.slice(5)}</span>}
            {calSummary.worst && calSummary.worst.pnl < 0 && <span>·&nbsp;&nbsp;Peor día: <b style={{ color: 'var(--red)' }}>{money(calSummary.worst.pnl)}</b> el {calSummary.worst.key.slice(5)}</span>}
            <span>·&nbsp;&nbsp;Racha: <b style={{ color: calSummary.streak > 0 ? 'var(--blue)' : '#c8d4e8' }}>{calSummary.streak}</b> {calSummary.streak === 1 ? 'día profitable' : 'días profitable'}</span>
          </div>
        )}
        <style>{`.cal-cell:hover{ transform: scale(1.02); border-color: rgba(79,143,255,0.45) !important; }`}</style>
        <Watermark />
      </div>

      {/* ── PROP FIRM ACCOUNTS — grouped by firm ── */}
      <PropFirmGroupsPanel trades={trades} />

      {/* Row 2 — analytical panels */}
      <div className="dash-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: 12 }}>
        <TraceScorePanel trades={trades} prevTrades={prevTrades} rangeLabel={PRESET_LABEL[preset]} />

        <ProLock feature="Progress Tracker" description="Visualiza tu progreso diario">
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '0.78rem', color: '#c8d4e8' }}>
                Progress Tracker
              </div>
              <span onClick={() => navigate('/progress')} style={{ fontSize: '0.68rem', color: 'var(--blue)', cursor: 'pointer' }}>Ver más →</span>
            </div>
            <ProgressHeatmap trades={trades} /><Watermark />
          </div>
        </ProLock>

        <ProLock feature="Equity curve" description="Tu PnL acumulado en el tiempo">
          <EquityCurvePanel trades={trades} prevTrades={prevTrades} currencySymbol={currencySymbol} />
        </ProLock>
      </div>

      {/* ── Recent activity ── */}
      <div className="dash-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start' }}>
          <div style={card}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, color: '#fff', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--dim)' }}>
              Operaciones recientes
            </div>
            {stats.recent.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: '14px 0' }}>Sin datos</div>
            ) : (
              stats.recent.map(t => {
                const isWin = t.pnl > 0;
                const status = t.pnl > 0 ? 'WIN' : t.pnl < 0 ? 'LOSS' : 'BE';
                return (
                  <div key={t.id} onClick={() => setDetailId(t.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--dim2)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{t.date.slice(5)}</span>
                      <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{t.asset}</span>
                      <span
                        style={{
                          fontSize: 9, padding: '1px 5px', borderRadius: 3,
                          background: isWin ? 'var(--blue-dim)' : status === 'LOSS' ? 'var(--red-dim)' : 'var(--dim2)',
                          color: isWin ? 'var(--blue)' : status === 'LOSS' ? 'var(--red)' : 'var(--muted)',
                          fontWeight: 700, letterSpacing: '0.06em',
                        }}
                      >{status}</span>
                    </div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: t.pnl >= 0 ? 'var(--blue)' : 'var(--red)' }}>{money(t.pnl)}</div>
                  </div>
                );
              })
            )}
            <Watermark />
          </div>

          <div style={card}>
            <div style={kpiLabel}>Saldo de cuenta</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, color: '#fff', fontWeight: 500, margin: '4px 0' }}>
              {currencySymbol}{Math.round(accountSize + stats.cum).toLocaleString('en-US')}
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: stats.cum >= 0 ? 'var(--blue)' : 'var(--red)' }}>
              {stats.cum >= 0 ? '↑' : '↓'} {money(stats.cum)} · {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
            </div>
            <Sparkline points={stats.equity} />
            <Watermark />
          </div>
      </div>
      </div>
      <TradeDetailModal trade={trades.find(t => t.id === detailId) ?? null} onClose={() => setDetailId(null)} />
      <AiWaitlistModal open={aiWaitlistOpen} onClose={() => { setAiWaitlistOpen(false); if (hasJoinedAiWaitlist()) setAiTeaserHidden(true); }} />
      <style>{`
        @media (max-width: 700px) {
          .dash-kpi-strip { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-row { grid-template-columns: 1fr !important; }
          .pf-mini-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ============ Prop firms dashboard panel ============ */

type PanelTrade = { pnl: number; date: string; time: string; accountId?: string };

const PF_PHASE_LABEL: Record<string, string> = {
  eval_p1: 'EVAL F1', eval_p2: 'EVAL F2', funded: 'FUNDED', passed_pending: 'PASSED',
};
const PF_PHASE_COLOR: Record<string, { bg: string; c: string }> = {
  eval_p1: { bg: 'rgba(245,158,11,0.12)', c: '#f59e0b' },
  eval_p2: { bg: 'rgba(245,158,11,0.12)', c: '#f59e0b' },
  funded: { bg: 'rgba(79,143,255,0.12)', c: '#4f8fff' },
  passed_pending: { bg: 'rgba(168,85,247,0.12)', c: '#a855f7' },
};
function pfInitials(firm: string) { return firm.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function pfColor(firm: string) {
  const colors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#eab308'];
  let h = 0; for (const ch of firm) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return colors[Math.abs(h) % colors.length];
}

const GROUPS_EXPANDED_KEY = 'dashboardFirmGroupsExpanded';
function loadExpanded(): string[] { try { return JSON.parse(localStorage.getItem(GROUPS_EXPANDED_KEY) || '[]'); } catch { return []; } }

function PropFirmGroupsPanel({ trades }: { trades: PanelTrade[] }) {
  const navigate = useNavigate();
  const accounts = useUserAccounts();
  const active = useMemo(() => getActiveAccounts(accounts), [accounts]);
  const tradesFor = (id: string) => trades.filter(t => t.accountId === id);
  const groups = useMemo(() => getAccountsGroupedByFirm(active), [active]);
  const alerts = useMemo(() => getAccountAlerts(accounts, tradesFor), [accounts, trades]);

  const [expanded, setExpanded] = useState<string[]>(loadExpanded);
  const toggle = (firm: string) => setExpanded(prev => {
    const next = prev.includes(firm) ? prev.filter(f => f !== firm) : [...prev, firm];
    try { localStorage.setItem(GROUPS_EXPANDED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

  return (
    <ProLock feature="Prop Firm Hub" description="Cuentas, fees, payouts, pass rate y ROI por firma">
      <div>
        {/* Section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#fff' }}>Mis prop firms</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate('/prop-firms')} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 7, padding: '5px 12px', fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>+ Añadir cuenta</button>
            <span onClick={() => navigate('/prop-firms')} style={{ fontSize: '0.72rem', color: 'var(--blue)', cursor: 'pointer' }}>Ver todas →</span>
          </div>
        </div>

        {active.length === 0 ? (
          <div style={{ background: '#15171d', border: '1px dashed #1e2029', borderRadius: 12, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>Aún no has añadido ninguna cuenta prop firm.</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '6px 0 16px' }}>Trackea tus cuentas en un solo lugar.</div>
            <button onClick={() => navigate('/prop-firms')} style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>Añadir primera cuenta →</button>
          </div>
        ) : (
          <>
            {alerts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {alerts.map((al, i) => {
                  const isTarget = al.kind === 'target_reached';
                  const col = isTarget ? '#4f8fff' : al.kind === 'near_dd' ? '#ef4444' : '#f59e0b';
                  const icon = isTarget ? '🎯' : al.kind === 'near_dd' ? '⚠️' : '⚖️';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: `${col}14`, border: `1px solid ${col}26`, borderRadius: 7, padding: '7px 11px', fontSize: '0.74rem', color: col }}>
                      <span>{icon}</span><span>{al.message}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {groups.map(g => (
              <FirmFolderCard key={g.firm} group={g} trades={trades} expanded={expanded.includes(g.firm)} onToggle={() => toggle(g.firm)} onOpenAccount={id => navigate(`/prop-firms/${id}`)} />
            ))}
          </>
        )}
      </div>
    </ProLock>
  );
}

function FirmKpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 70 }}>
      <div style={{ fontSize: '0.56rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: '0.82rem', color: color || '#fff', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginTop: 2 }}>{value}</div>
    </div>
  );
}

function FirmFolderCard({ group, trades, expanded, onToggle, onOpenAccount }: { group: FirmGroup; trades: PanelTrade[]; expanded: boolean; onToggle: () => void; onOpenAccount: (id: string) => void }) {
  const { firm, accounts, totals } = group;
  return (
    <div style={{ background: '#15171d', border: '1px solid #1e2029', borderRadius: 12, padding: '18px 22px', marginBottom: 12 }}>
      {/* Header row */}
      <div onClick={onToggle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, cursor: 'pointer', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, background: pfColor(firm), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{pfInitials(firm)}</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>{firm}</div>
          <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted)', fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10 }}>{totals.count} {totals.count === 1 ? 'cuenta' : 'cuentas'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <FirmKpi label="Net" value={fmtMoney(totals.net)} color={totals.net >= 0 ? 'var(--blue)' : 'var(--red)'} />
          <FirmKpi label="Payouts" value={`$${Math.round(totals.payouts).toLocaleString('en-US')}`} />
          <FirmKpi label="ROI" value={`${Math.round(totals.roi)}%`} color={totals.roi >= 0 ? 'var(--blue)' : 'var(--red)'} />
          <span style={{ color: 'var(--muted)', fontSize: 14, display: 'inline-flex', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▸</span>
        </div>
      </div>

      {/* Expanded accounts */}
      {expanded && (
        <div className="firm-accts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, marginTop: 16 }}>
          {accounts.map(a => <FirmAccountMiniCard key={a.id} account={a} trades={trades.filter(t => t.accountId === a.id)} onOpen={() => onOpenAccount(a.id)} />)}
        </div>
      )}
    </div>
  );
}

function daysSince(iso: string) {
  const ms = Date.now() - new Date(`${iso}T00:00:00`).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function FirmAccountMiniCard({ account: a, trades, onOpen }: { account: PropFirmAccount; trades: PanelTrade[]; onOpen: () => void }) {
  const st = computeAccountStatus(a, trades);
  const progressPct = Math.max(0, Math.min(100, st.progressPct * 100));
  const ddPct = Math.max(0, Math.min(100, st.ddBufferPct * 100));
  const ddColor = st.ddBufferPct > 0.5 ? 'var(--blue)' : st.ddBufferPct > 0.25 ? '#f59e0b' : 'var(--red)';
  const phase = PF_PHASE_COLOR[a.phase] ?? { bg: 'var(--dim2)', c: 'var(--muted)' };
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1e2029', borderRadius: 8, padding: '14px 16px' }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>${Math.round(a.accountSize / 1000)}K</span>
          <span style={{ background: phase.bg, color: phase.c, fontSize: 8, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{PF_PHASE_LABEL[a.phase] ?? a.phase}</span>
        </div>
        <button onClick={onOpen} title="Ver cuenta" style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>⋯</button>
      </div>

      {/* Progress to target */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--muted)', marginBottom: 4 }}>
        <span>Hacia target</span>
        <span style={{ color: st.targetReached ? 'var(--blue)' : '#c8d4e8' }}>{fmtMoney(st.pnl)} / {fmtMoney(a.profitTarget).replace('+', '')}</span>
      </div>
      <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--blue)' }} />
      </div>

      {/* DD buffer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--muted)', margin: '8px 0 4px' }}>
        <span>Distancia a max DD</span>
        <span style={{ color: ddColor }}>{fmtMoney(st.ddBuffer).replace('+', '')}</span>
      </div>
      <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${ddPct}%`, height: '100%', background: ddColor }} />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: '0.72rem' }}>
        <span style={{ color: 'var(--muted)' }}>{st.tradeCount} ops · {daysSince(a.purchaseDate)} días</span>
        <span onClick={onOpen} style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}>Ver →</span>
      </div>
    </div>
  );
}

function ProgressHeatmap({ trades }: { trades: { date: string; pnl: number }[] }) {
  // Last 6 weeks heatmap
  const today = new Date();
  const cells: { date: string; pnl: number | null }[] = [];
  for (let i = 41; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayPnl = trades.filter(t => t.date === key).reduce((s, t) => s + t.pnl, 0);
    cells.push({ date: key, pnl: trades.some(t => t.date === key) ? dayPnl : null });
  }
  const colorFor = (p: number | null) => {
    if (p === null) return 'var(--dim2)';
    if (p < 0) return 'rgba(239,68,68,0.45)';
    if (p < 100) return 'rgba(79,143,255,0.2)';
    if (p < 300) return 'rgba(79,143,255,0.45)';
    return 'rgba(79,143,255,0.75)';
  };
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3 }}>
        {cells.map((c, i) => (
          <div key={i} title={`${c.date}: ${c.pnl ?? '—'}`} style={{ aspectRatio: '1', borderRadius: 3, background: colorFor(c.pnl) }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 9, color: 'var(--muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>Menos</span>
          {[null, 50, 200, 500].map((v, i) => <div key={i} style={{ width: 9, height: 9, borderRadius: 2, background: colorFor(v) }} />)}
          <span>Más</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }} />
          <span>Pérdida</span>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

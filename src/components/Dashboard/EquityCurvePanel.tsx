import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import type { Trade } from '../../store/tradeStore';
import { formatDate } from '../../utils/formatIntl';

const HEAD = "'Syne', sans-serif";
const BODY = "'Space Grotesk', sans-serif";
const C = { card: '#15171d', border: '#1e2029', bg: '#0a0a0c', blue: '#4f8fff', red: '#ef4444', text: '#f7f8fa', text2: '#c8d4e8', muted: '#6b7280' };

type Range = 'all' | '1y' | '6m' | '3m' | '1m' | '1w';
const RANGES: [Range, string, number | null][] = [['all', 'Todo', null], ['1y', '1A', 365], ['6m', '6M', 180], ['3m', '3M', 90], ['1m', '1M', 30], ['1w', '1S', 7]];

interface Pt { date: string; equity: number; dayPnl: number; dayTrades: number; dayWins: number; prevEquity?: number }

function buildCurve(trades: Trade[], lookback: number | null): Pt[] {
  let list = trades;
  if (lookback) { const c = new Date(); c.setDate(c.getDate() - lookback); const cut = c.toISOString().slice(0, 10); list = trades.filter(t => t.date >= cut); }
  const byDate: Record<string, { pnl: number; n: number; wins: number }> = {};
  list.forEach(t => { const e = byDate[t.date] ?? { pnl: 0, n: 0, wins: 0 }; e.pnl += t.pnl; e.n += 1; if (t.pnl > 0) e.wins += 1; byDate[t.date] = e; });
  const dates = Object.keys(byDate).sort();
  let cum = 0;
  return dates.map(d => { const e = byDate[d]; cum += e.pnl; return { date: d, equity: Math.round(cum), dayPnl: e.pnl, dayTrades: e.n, dayWins: e.wins }; });
}

function compactMoney(n: number, sym: string): string {
  const s = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 1000) return `${s}${sym}${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}K`;
  return `${s}${sym}${Math.round(a)}`;
}

export function EquityCurvePanel({ trades, prevTrades, currencySymbol }: { trades: Trade[]; prevTrades?: Trade[] | null; currencySymbol: string }) {
  const [range, setRange] = useState<Range>('all');
  const [compare, setCompare] = useState(false);
  const lookback = RANGES.find(r => r[0] === range)![2];

  const data = useMemo(() => {
    const cur = buildCurve(trades, lookback);
    if (compare && prevTrades && prevTrades.length) {
      const prev = buildCurve(prevTrades, lookback);
      return cur.map((p, i) => ({ ...p, prevEquity: prev[i]?.equity }));
    }
    return cur;
  }, [trades, prevTrades, lookback, compare]);

  const total = data.length ? data[data.length - 1].equity : 0;
  const prevTotal = useMemo(() => { if (!prevTrades?.length) return null; const p = buildCurve(prevTrades, lookback); return p.length ? p[p.length - 1].equity : 0; }, [prevTrades, lookback]);
  const deltaPct = prevTotal && prevTotal !== 0 ? ((total - prevTotal) / Math.abs(prevTotal)) * 100 : null;
  const lineColor = total >= 0 ? C.blue : C.red;
  const canCompare = !!(prevTrades && prevTrades.length);

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px', minHeight: 380, display: 'flex', flexDirection: 'column', fontFamily: BODY }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: '0.95rem', color: C.text }}>Net PnL acumulado</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
            <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: '1.4rem', color: lineColor }}>{total >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(total).toLocaleString('en-US')}</span>
            {deltaPct !== null && <span style={{ fontSize: '0.72rem', color: deltaPct >= 0 ? C.blue : C.red }}>{deltaPct >= 0 ? '↗ +' : '↘ '}{deltaPct.toFixed(0)}% vs periodo anterior</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {canCompare && (
            <button onClick={() => setCompare(c => !c)} style={{ background: compare ? 'rgba(79,143,255,0.12)' : 'transparent', border: `1px solid ${compare ? 'rgba(79,143,255,0.3)' : C.border}`, color: compare ? C.blue : C.muted, borderRadius: 8, padding: '5px 10px', fontSize: '0.7rem', cursor: 'pointer', fontFamily: BODY }}>Comparar</button>
          )}
          <div style={{ display: 'flex', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, gap: 2 }}>
            {RANGES.map(([r, l]) => (
              <button key={r} onClick={() => setRange(r)} style={{ padding: '5px 9px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: BODY, background: range === r ? 'rgba(79,143,255,0.14)' : 'transparent', color: range === r ? C.blue : C.muted }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* chart */}
      <div style={{ flex: 1, minHeight: 260 }}>
        {data.length < 2 ? (
          <div style={{ height: '100%', minHeight: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: C.muted }}>
            <div style={{ fontSize: '0.9rem' }}>Añade tu primera operación para ver la curva</div>
            <button onClick={() => window.dispatchEvent(new CustomEvent('trace:open-add-trade'))} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: BODY }}>＋ Añadir operación</button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={260}>
            <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.045)" strokeDasharray="2 4" />
              <XAxis dataKey="date" tickFormatter={d => formatDate(d, { day: 'numeric', month: 'short' })} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: BODY }} axisLine={false} tickLine={false} minTickGap={44} />
              <YAxis tickFormatter={n => compactMoney(n, currencySymbol)} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: BODY }} axisLine={false} tickLine={false} width={56} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
              <Tooltip content={<EqTooltip sym={currencySymbol} />} cursor={{ stroke: 'rgba(255,255,255,0.22)', strokeDasharray: '3 3' }} />
              {compare && <Area dataKey="prevEquity" type="monotone" stroke="rgba(255,255,255,0.32)" strokeWidth={1.5} strokeDasharray="5 4" fill="none" dot={false} isAnimationActive={false} />}
              <Area dataKey="equity" type="monotone" stroke={lineColor} strokeWidth={2.5} fill="url(#eqFill)" dot={false} activeDot={{ r: 5, fill: lineColor, stroke: '#fff', strokeWidth: 2 }} isAnimationActive animationDuration={500} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function EqTooltip({ active, payload, sym }: { active?: boolean; payload?: Array<{ dataKey?: string | number; payload?: Pt }>; sym: string }) {
  if (!active || !payload || !payload.length) return null;
  const p = (payload.find(x => x.dataKey === 'equity') ?? payload[0])?.payload;
  if (!p) return null;
  const wr = p.dayTrades ? Math.round((p.dayWins / p.dayTrades) * 100) : 0;
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem', boxShadow: '0 8px 20px rgba(0,0,0,0.4)', minWidth: 160 }}>
      <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: '0.85rem', color: C.text, marginBottom: 5 }}>{formatDate(p.date, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
      <div style={{ color: p.equity >= 0 ? C.blue : C.red }}>Acumulado: {p.equity >= 0 ? '+' : '-'}{sym}{Math.abs(p.equity).toLocaleString('en-US')}</div>
      <div style={{ color: p.dayPnl >= 0 ? C.blue : C.red }}>Ese día: {p.dayPnl >= 0 ? '+' : '-'}{sym}{Math.abs(Math.round(p.dayPnl)).toLocaleString('en-US')}</div>
      <div style={{ color: C.text2, marginTop: 2 }}>{p.dayTrades} {p.dayTrades === 1 ? 'operación' : 'operaciones'} · {wr}% aciertos</div>
    </div>
  );
}

export default EquityCurvePanel;

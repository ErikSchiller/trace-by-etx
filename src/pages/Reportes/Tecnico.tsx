import { Fragment, useMemo, useState } from 'react';
import type { Trade } from '../../store/tradeStore';
import { useInsightPanel } from '../../store/insightPanelStore';
import { Watermark } from '../../components/UI/Watermark';
import { LineChart } from '../../components/Charts/LineChart';
import {
  card, label, fontHead, fontBody, fmt, pnlColor, SESSION_LABEL, SESSION_FLAG, SESSIONS, WEEKDAYS,
  statsFor, groupBy, equityPoints, rOf, Mini,
} from './shared';

interface Props { trades: Trade[]; prevTrades: Trade[] | null; compareOn: boolean }

export function Tecnico({ trades }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SetupsBlock trades={trades} />
      <SessionsBlock trades={trades} />
      <TimingBlock trades={trades} />
      <ExecutionBlock trades={trades} />
      <RRScatterBlock trades={trades} />
      <style>{`@media (max-width:900px){ .rep-2col,.rep-2x2{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

/* ── Setups ── */
type SetupSort = 'pnl' | 'n' | 'wr' | 'pf' | 'exp';
function SetupsBlock({ trades }: { trades: Trade[] }) {
  const [sort, setSort] = useState<SetupSort>('pnl');
  const rows = useMemo(() => {
    const groups = groupBy(trades, t => t.setup || 'Sin setup');
    const arr = [...groups.entries()].map(([setup, list]) => ({ setup, ...statsFor(list) }));
    arr.sort((a, b) => (sort === 'pnl' ? b.pnl - a.pnl : sort === 'n' ? b.n - a.n : sort === 'wr' ? b.wr - a.wr : sort === 'pf' ? (b.pf === Infinity ? 1 : b.pf) - (a.pf === Infinity ? 1 : a.pf) : b.exp - a.exp));
    return arr;
  }, [trades, sort]);
  const maxAbs = Math.max(...rows.map(r => Math.abs(r.pnl)), 1);

  const cols: [string, SetupSort | null][] = [['Setup', null], ['Ops', 'n'], ['Win %', 'wr'], ['PF', 'pf'], ['Avg Win', null], ['Avg Loss', null], ['Net PnL', 'pnl'], ['Exp (R)', 'exp'], ['Mejor / Peor', null]];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ ...label, padding: '14px 16px 4px', marginBottom: 0 }}>Setups y estrategias</div>
        <table style={{ width: '100%', fontSize: '0.76rem', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
            <tr style={{ fontSize: '0.6rem', color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {cols.map(([h, key]) => (
                <th key={h} onClick={() => key && setSort(key)} style={{ padding: '10px 14px', textAlign: h === 'Setup' ? 'left' : 'right', fontWeight: 600, cursor: key ? 'pointer' : 'default', color: key === sort ? 'var(--blue)' : undefined }}>{h}{key === sort ? ' ▾' : ''}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const top = i === 0 && r.pnl > 0 && sort === 'pnl';
              return (
                <tr key={r.setup} onClick={() => useInsightPanel.getState().open({ type: 'setup', value: r.setup })} style={{ borderTop: '1px solid #1a1a1c', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '9px 14px', color: top ? 'var(--blue)' : '#fff', fontWeight: 600 }}>{r.setup}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: '#888898' }}>{r.n}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: '#fff' }}>{r.wr.toFixed(0)}%</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: '#fff' }}>{isFinite(r.pf) ? r.pf.toFixed(2) : '∞'}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: 'var(--blue)' }}>{fmt(r.aw)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: 'var(--red)' }}>{fmt(r.al)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: pnlColor(r.pnl), fontWeight: 600 }}>{fmt(r.pnl)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: pnlColor(r.exp) }}>{r.exp >= 0 ? '+' : ''}{r.exp.toFixed(1)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 11 }}><span style={{ color: 'var(--blue)' }}>{fmt(r.best)}</span> / <span style={{ color: 'var(--red)' }}>{fmt(r.worst)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Watermark />
      </div>
      <div style={card}>
        <div style={label}>Net PnL por setup</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          {[...rows].sort((a, b) => b.pnl - a.pnl).map(r => (
            <div key={r.setup} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 90, fontSize: '0.72rem', color: '#c8d4e8', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.setup}</div>
              <div style={{ flex: 1, height: 16, position: 'relative', background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: r.pnl >= 0 ? '50%' : `${50 - (Math.abs(r.pnl) / maxAbs) * 48}%`, width: `${(Math.abs(r.pnl) / maxAbs) * 48}%`, background: pnlColor(r.pnl), borderRadius: 3 }} />
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border-subtle)' }} />
              </div>
              <div style={{ width: 70, fontSize: '0.72rem', textAlign: 'right', color: pnlColor(r.pnl), flexShrink: 0 }}>{fmt(r.pnl)}</div>
            </div>
          ))}
        </div>
        <Watermark />
      </div>
    </div>
  );
}

/* ── Sessions ── */
function SessionsBlock({ trades }: { trades: Trade[] }) {
  const rows = SESSIONS.map(sess => ({ sess, list: trades.filter(t => t.session === sess) }));
  const maxAbs = Math.max(...rows.map(r => Math.abs(statsFor(r.list).pnl)), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="rep-2x2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {rows.map(({ sess, list }) => {
          const s = statsFor(list);
          return (
            <div key={sess} onClick={() => list.length && useInsightPanel.getState().open({ type: 'session', value: sess })} style={{ ...card, cursor: list.length ? 'pointer' : 'default' }}
              onMouseEnter={e => { if (list.length) e.currentTarget.style.borderColor = 'rgba(79,143,255,0.4)'; }}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>{SESSION_FLAG[sess]}</span>
                <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>{SESSION_LABEL[sess]}</span>
              </div>
              {list.length === 0 ? <div style={{ fontSize: 12, color: '#33334a' }}>Sin operaciones</div> : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    <Mini label="Net PnL" value={fmt(s.pnl)} color={pnlColor(s.pnl)} />
                    <Mini label="Ops / WR" value={`${s.n} · ${s.wr.toFixed(0)}%`} />
                    <Mini label="PF" value={isFinite(s.pf) ? s.pf.toFixed(2) : '∞'} />
                    <Mini label="Avg R" value={`${s.exp >= 0 ? '+' : ''}${s.exp.toFixed(1)}`} color={pnlColor(s.exp)} />
                  </div>
                  <div style={{ marginTop: 6 }}><LineChart data={equityPoints(list)} height={40} showGrid={false} showPeak={false} /></div>
                </>
              )}
              <Watermark />
            </div>
          );
        })}
      </div>
      <div style={card}>
        <div style={label}>Comparación de sesiones (Net PnL)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 140, paddingTop: 10 }}>
          {rows.map(({ sess, list }) => {
            const s = statsFor(list);
            return (
              <div key={sess} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={`${SESSION_LABEL[sess]}: ${fmt(s.pnl)}`}>
                <div style={{ fontSize: 10, color: pnlColor(s.pnl), marginBottom: 4 }}>{s.n ? fmt(s.pnl) : ''}</div>
                <div style={{ width: '50%', maxWidth: 48, height: Math.max(3, (Math.abs(s.pnl) / maxAbs) * 90), background: s.n === 0 ? '#1a1a1c' : pnlColor(s.pnl), borderRadius: '4px 4px 0 0' }} />
                <div style={{ fontSize: 16, marginTop: 6 }}>{SESSION_FLAG[sess]}</div>
                <div style={{ fontSize: 9, color: '#888898' }}>{s.n} ops · {s.wr.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
        <Watermark />
      </div>
    </div>
  );
}

/* ── Timing (heatmap + breakdowns) ── */
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);
type HMetric = 'expectancy' | 'pnl' | 'winrate' | 'volume';
interface CellAgg { sum: number; n: number; wins: number; rTotal: number }

function TimingBlock({ trades }: { trades: Trade[] }) {
  const [metric, setMetric] = useState<HMetric>('expectancy');
  const grid = useMemo(() => {
    const cells: CellAgg[][] = Array.from({ length: 7 }, () => HOURS.map(() => ({ sum: 0, n: 0, wins: 0, rTotal: 0 })));
    for (const t of trades) {
      const day = new Date(`${t.date}T00:00:00`).getDay();
      const col = HOURS.indexOf(parseInt(t.time.slice(0, 2), 10));
      if (col < 0) continue;
      const c = cells[day][col];
      c.sum += t.pnl; c.n += 1; if (t.pnl > 0) c.wins += 1; c.rTotal += rOf(t);
    }
    return cells;
  }, [trades]);

  const cellMetric = (c: CellAgg): number | null => {
    if (c.n === 0) return null;
    return metric === 'expectancy' ? c.rTotal / c.n : metric === 'pnl' ? c.sum : metric === 'winrate' ? (c.wins / c.n) * 100 : c.n;
  };
  const allVals = grid.flat().map(cellMetric).filter((v): v is number => v !== null);
  const maxAbs = Math.max(...allVals.map(Math.abs), 1);
  const cellColor = (v: number | null) => {
    if (v === null) return '#1a1a1c';
    const norm = metric === 'winrate' ? (v - 50) / 50 : v / maxAbs;
    return norm >= 0 ? `rgba(79,143,255,${0.15 + Math.min(1, Math.abs(norm)) * 0.55})` : `rgba(239,68,68,${0.15 + Math.min(1, Math.abs(norm)) * 0.55})`;
  };
  const fmtMetric = (c: CellAgg) => {
    const v = cellMetric(c); if (v === null) return '';
    return metric === 'pnl' ? fmt(v) : metric === 'winrate' ? `${Math.round(v)}%` : metric === 'volume' ? String(v) : (v >= 0 ? '+' : '') + v.toFixed(1) + 'R';
  };

  const hourAgg = HOURS.map((_, hi) => { let r = 0, n = 0; grid.forEach(row => { r += row[hi].rTotal; n += row[hi].n; }); return { hour: HOURS[hi], exp: n ? r / n : 0, n }; });
  const dayAgg = grid.map((row, d) => { const r = row.reduce((s, c) => s + c.rTotal, 0), n = row.reduce((s, c) => s + c.n, 0), pnl = row.reduce((s, c) => s + c.sum, 0); return { day: d, exp: n ? r / n : 0, pnl, n }; });
  const maxHourExp = Math.max(...hourAgg.map(h => Math.abs(h.exp)), 0.1);
  const maxDayPnl = Math.max(...dayAgg.map(h => Math.abs(h.pnl)), 1);
  // top/bottom 3 hours by expectancy
  const ranked = [...hourAgg].filter(h => h.n > 0).sort((a, b) => b.exp - a.exp);
  const top3 = new Set(ranked.slice(0, 3).map(h => h.hour));
  const bot3 = new Set(ranked.slice(-3).map(h => h.hour));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ ...card, overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ ...label, marginBottom: 0 }}>Performance por hora y día</div>
          <div style={{ display: 'inline-flex', background: '#0d0d0f', border: '1px solid #1e1e20', borderRadius: 18, padding: 3, gap: 2 }}>
            {([['expectancy', 'Expectancy'], ['pnl', 'Net PnL'], ['winrate', 'Win %'], ['volume', 'Volumen']] as [HMetric, string][]).map(([m, l]) => (
              <button key={m} onClick={() => setMetric(m)} style={{ padding: '4px 11px', borderRadius: 14, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody, background: metric === m ? '#1e1e28' : 'transparent', border: metric === m ? '1px solid #2a2a35' : '1px solid transparent', color: metric === m ? '#fff' : '#4a4a60' }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `auto repeat(${HOURS.length}, 1fr)`, gap: 3, minWidth: 720 }}>
          <div />
          {HOURS.map(h => <div key={h} style={{ fontSize: 9, color: '#33334a', textAlign: 'center' }}>{h}</div>)}
          {grid.map((row, d) => (
            <Fragment key={d}>
              <div style={{ fontSize: 10, color: '#4a4a60', paddingRight: 8, alignSelf: 'center' }}>{WEEKDAYS[d].slice(0, 3)}</div>
              {row.map((c, h) => (
                <div key={h} onClick={() => c.n && useInsightPanel.getState().open({ type: 'hourslot', value: `${d}-${HOURS[h]}` })} title={c.n ? `${WEEKDAYS[d]} ${HOURS[h]}h · ${c.n} ops · ${fmt(c.sum)}` : ''} style={{ height: 32, background: cellColor(cellMetric(c)), borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: c.n ? '#fff' : 'transparent', fontFamily: fontBody, cursor: c.n ? 'pointer' : 'default' }}>{c.n ? fmtMetric(c) : ''}</div>
              ))}
            </Fragment>
          ))}
        </div>
        <Watermark />
      </div>

      <div className="rep-2col" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
        <div style={card}>
          <div style={label}>Expectancy por hora (top/bottom 3 resaltados)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 120, paddingTop: 10 }}>
            {hourAgg.map(h => {
              const isTop = top3.has(h.hour), isBot = bot3.has(h.hour);
              const col = h.n === 0 ? '#1a1a1c' : isTop ? 'var(--blue)' : isBot ? 'var(--red)' : 'rgba(255,255,255,0.18)';
              return (
                <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={`${h.hour}h · ${h.exp.toFixed(2)}R`}>
                  <div style={{ width: '70%', height: Math.max(2, (Math.abs(h.exp) / maxHourExp) * 90), background: col, borderRadius: 3 }} />
                  <div style={{ fontSize: 8, color: '#4a4a60', marginTop: 3 }}>{h.hour}</div>
                </div>
              );
            })}
          </div>
          <Watermark />
        </div>
        <div style={card}>
          <div style={label}>Net PnL por día</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 120, paddingTop: 10 }}>
            {dayAgg.map(d => (
              <div key={d.day} onClick={() => d.n && useInsightPanel.getState().open({ type: 'weekday', value: d.day })} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', cursor: d.n ? 'pointer' : 'default' }} title={`${WEEKDAYS[d.day]} · ${fmt(d.pnl)}`}>
                <div style={{ width: '60%', height: Math.max(2, (Math.abs(d.pnl) / maxDayPnl) * 90), background: d.n === 0 ? '#1a1a1c' : pnlColor(d.pnl), borderRadius: 3 }} />
                <div style={{ fontSize: 8, color: '#4a4a60', marginTop: 3 }}>{WEEKDAYS[d.day].slice(0, 1)}</div>
              </div>
            ))}
          </div>
          <Watermark />
        </div>
      </div>
    </div>
  );
}

/* ── Execution ── */
function ExecutionBlock({ trades }: { trades: Trade[] }) {
  const planned = trades.filter(t => t.isPlanBased);
  const unplanned = trades.filter(t => !t.isPlanBased);
  const planPct = trades.length ? planned.length / trades.length : 0;
  const avgPlan = planned.length ? planned.reduce((s, t) => s + t.pnl, 0) / planned.length : 0;
  const avgOff = unplanned.length ? unplanned.reduce((s, t) => s + t.pnl, 0) / unplanned.length : 0;
  const planBetter = avgOff !== 0 ? ((avgPlan - avgOff) / Math.abs(avgOff)) * 100 : null;

  const exits: { key: string; label: string }[] = [{ key: 'tp_hit', label: 'TP hit' }, { key: 'sl_hit', label: 'SL hit' }, { key: 'manual', label: 'Manual' }];
  const exitData = exits.map(e => { const list = trades.filter(t => t.exitType === e.key); return { ...e, n: list.length, avg: list.length ? list.reduce((s, t) => s + t.pnl, 0) / list.length : 0 }; });
  const maxExit = Math.max(...exitData.map(e => e.n), 1);
  const manual = exitData.find(e => e.key === 'manual')!;
  const manualPct = trades.length ? (manual.n / trades.length) * 100 : 0;

  return (
    <div className="rep-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div style={card}>
        <div style={label}>Adherencia al plan</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 6 }}>
          <DonutMini pct={planPct} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Mini label="Media según plan" value={fmt(avgPlan)} color={pnlColor(avgPlan)} />
            <Mini label="Media fuera de plan" value={fmt(avgOff)} color={pnlColor(avgOff)} />
          </div>
        </div>
        {planBetter !== null && (
          <div style={{ marginTop: 12, fontSize: '0.78rem', color: '#c8d4e8' }}>💡 Cuando operas según el plan, ganas <b style={{ color: planBetter >= 0 ? 'var(--blue)' : 'var(--red)' }}>{planBetter >= 0 ? '+' : ''}{planBetter.toFixed(0)}%</b> {planBetter >= 0 ? 'más' : 'menos'}.</div>
        )}
        <Watermark />
      </div>
      <div style={card}>
        <div style={label}>Tipo de salida</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, height: 100, paddingTop: 10 }}>
          {exitData.map(e => (
            <div key={e.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div style={{ fontSize: 11, color: '#fff', marginBottom: 4 }}>{e.n}</div>
              <div style={{ width: '55%', maxWidth: 46, height: Math.max(3, (e.n / maxExit) * 70), background: e.key === 'tp_hit' ? 'var(--blue)' : e.key === 'sl_hit' ? 'var(--red)' : '#8a90a8', borderRadius: '4px 4px 0 0' }} />
              <div style={{ fontSize: 10, color: '#888898', marginTop: 5 }}>{e.label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          TP hit generan <b style={{ color: 'var(--blue)' }}>{fmt(exitData[0].avg)}</b> de media · SL hit <b style={{ color: 'var(--red)' }}>{fmt(exitData[1].avg)}</b><br />
          Cierres manuales: {manualPct.toFixed(0)}% del total — media <b style={{ color: pnlColor(manual.avg) }}>{fmt(manual.avg)}</b>
        </div>
        <Watermark />
      </div>
    </div>
  );
}

function DonutMini({ pct }: { pct: number }) {
  const r = 34, c = 2 * Math.PI * r, mid = 42;
  return (
    <svg width={84} height={84} viewBox="0 0 84 84" style={{ flexShrink: 0 }}>
      <circle cx={mid} cy={mid} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={9} />
      <circle cx={mid} cy={mid} r={r} fill="none" stroke="var(--blue)" strokeWidth={9} strokeLinecap="round" strokeDasharray={`${pct * c} ${c}`} transform={`rotate(-90 ${mid} ${mid})`} />
      <text x={mid} y={mid + 5} textAnchor="middle" fontFamily="'Syne',sans-serif" fontWeight="800" fontSize="18" fill="#fff">{Math.round(pct * 100)}%</text>
    </svg>
  );
}

/* ── R:R planned vs real scatter ── */
function RRScatterBlock({ trades }: { trades: Trade[] }) {
  const pts = trades.filter(t => t.plannedRR > 0);
  if (pts.length < 3) return null;
  const maxR = Math.max(4, ...pts.map(t => Math.max(t.plannedRR, Math.abs(t.realRR || 0))));
  const W = 460, H = 300, pad = 34;
  const x = (v: number) => pad + (v / maxR) * (W - pad * 2);
  const yLo = -maxR, yHi = maxR;
  const y = (v: number) => H - pad - ((v - yLo) / (yHi - yLo)) * (H - pad * 2);
  const avgRatio = pts.reduce((s, t) => s + (t.realRR || 0) / t.plannedRR, 0) / pts.length;
  const avgPlanned = pts.reduce((s, t) => s + t.plannedRR, 0) / pts.length;

  return (
    <div style={card}>
      <div style={label}>R:R planeado vs real</div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 520, height: 'auto' }}>
          <line x1={pad} y1={y(0)} x2={W - pad} y2={y(0)} stroke="var(--border-subtle)" strokeWidth="1" />
          <line x1={x(0)} y1={pad} x2={x(0)} y2={H - pad} stroke="var(--border-subtle)" strokeWidth="1" />
          {/* diagonal planned = realized */}
          <line x1={x(0)} y1={y(0)} x2={x(maxR)} y2={y(maxR)} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4 4" />
          {pts.map((t, i) => (
            <circle key={i} cx={x(t.plannedRR)} cy={y(t.realRR || 0)} r={3.5} fill={t.pnl >= 0 ? 'var(--blue)' : 'var(--red)'} opacity={0.75} />
          ))}
          <text x={W - pad} y={y(0) - 6} textAnchor="end" fontSize="9" fill="#4a4a60">R:R planeado →</text>
          <text x={x(0) + 6} y={pad + 4} fontSize="9" fill="#4a4a60">R:R real ↑</text>
        </svg>
      </div>
      <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#c8d4e8', lineHeight: 1.6 }}>
        En promedio realizas <b style={{ color: avgRatio >= 1 ? 'var(--blue)' : 'var(--red)' }}>{(avgRatio * 100).toFixed(0)}%</b> del R:R que planeas.<br />
        Si respetaras tu planeado ({avgPlanned.toFixed(1)}R medio), tu expectancy subiría.
      </div>
      <Watermark />
    </div>
  );
}

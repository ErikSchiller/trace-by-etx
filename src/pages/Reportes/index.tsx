import { Fragment, useMemo, useState } from 'react';
import {
  useUserTrades, getWinRate, getProfitFactor, getCumulativePnL,
  getAvgWin, getAvgLoss, getMaxDrawdown, type Trade,
} from '../../store/tradeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { ProLock } from '../../components/UI/ProLock';
import { Watermark } from '../../components/UI/Watermark';

const fontHead = "'Syne', sans-serif";
const card: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '16px 18px', position: 'relative',
};
const label: React.CSSProperties = {
  fontSize: '0.62rem', color: '#4a4a60', letterSpacing: '0.08em',
  textTransform: 'uppercase', fontWeight: 600, marginBottom: 8,
};
const big: React.CSSProperties = {
  fontFamily: fontHead, fontWeight: 800, fontSize: '1.5rem', color: '#fff', lineHeight: 1,
};

type Category =
  | 'general' | 'setup' | 'session' | 'weekday'
  | 'hour' | 'emotion' | 'asset' | 'streaks';

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'general', label: 'Resumen general' },
  { id: 'setup',   label: 'Por estrategia' },
  { id: 'session', label: 'Por sesión' },
  { id: 'weekday', label: 'Por día de la semana' },
  { id: 'hour',    label: 'Por horario' },
  { id: 'emotion', label: 'Por estado emocional' },
  { id: 'asset',   label: 'Por activo' },
  { id: 'streaks', label: 'Drawdown y rachas' },
];

const SESSION_LABEL: Record<string, string> = {
  london: 'Londres', new_york: 'Nueva York', asia: 'Asia', premarket: 'Pre-market',
};
const SESSION_FLAG: Record<string, string> = {
  london: '🇬🇧', new_york: '🇺🇸', asia: '🇯🇵', premarket: '🌅',
};
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const EMOJIS: Record<number, string> = { 1: '😌', 2: '🙂', 3: '😐', 4: '😟', 5: '😰' };

function fmt(n: number) {
  if (!isFinite(n)) return '—';
  return `${n >= 0 ? '+' : '-'}€${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}
function pnlColor(n: number) { return n >= 0 ? 'var(--blue)' : 'var(--red)'; }

function statsFor(list: Trade[]) {
  const wins = list.filter(t => t.pnl > 0);
  const losses = list.filter(t => t.pnl < 0);
  return {
    n: list.length,
    pnl: list.reduce((s, t) => s + t.pnl, 0),
    wr: list.length ? (wins.length / list.length) * 100 : 0,
    pf: getProfitFactor(list),
    aw: wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0,
    al: losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0,
    best: list.length ? Math.max(...list.map(t => t.pnl)) : 0,
    worst: list.length ? Math.min(...list.map(t => t.pnl)) : 0,
  };
}

function groupBy<K extends string | number>(trades: Trade[], key: (t: Trade) => K) {
  const map = new Map<K, Trade[]>();
  for (const t of trades) {
    const k = key(t);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  }
  return map;
}

function EmptyReport() {
  return (
    <div style={{ ...card, padding: 50, textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>📊</div>
      <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: 6 }}>
        Sin datos suficientes para este reporte
      </div>
      <div style={{ fontSize: 13, color: '#4a4a60' }}>
        Necesitas al menos 5 operaciones registradas.
      </div>
    </div>
  );
}

export default function Reportes() {
  const trades = useUserTrades();
  const beCountsAsWin = useSettingsStore(st => st.beCountsAsWin);
  const [cat, setCat] = useState<Category>('general');
  const enough = trades.length >= 5;

  return (
    <ProLock feature="Reportes avanzados" description="Acceso a 50+ reportes para mejorar tu trading">
      <div style={{ display: 'flex', minHeight: '100%' }}>
        {/* Category sidebar */}
        <nav style={{
          width: 180, flexShrink: 0, background: 'var(--bg2)',
          borderRight: '1px solid var(--border)', padding: '16px 8px',
        }}>
          {CATEGORIES.map(c => {
            const active = cat === c.id;
            return (
              <button
                key={c.id} onClick={() => setCat(c.id)}
                style={{
                  width: '100%', textAlign: 'left',
                  background: active ? 'rgba(79,143,255,0.1)' : 'transparent',
                  color: active ? 'var(--blue)' : '#4a4a60',
                  border: 'none',
                  borderLeft: active ? '2px solid var(--blue)' : '2px solid transparent',
                  padding: '8px 10px', fontSize: '0.78rem',
                  fontWeight: active ? 600 : 500, cursor: 'pointer',
                  borderRadius: 6, margin: '1px 0',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >{c.label}</button>
            );
          })}
        </nav>

        <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!enough ? <EmptyReport /> : (
            <>
              {cat === 'general' && <GeneralReport trades={trades} />}
              {cat === 'setup' && <SetupReport trades={trades} />}
              {cat === 'session' && <SessionReport trades={trades} />}
              {cat === 'weekday' && <WeekdayReport trades={trades} />}
              {cat === 'hour' && <HourReport trades={trades} />}
              {cat === 'emotion' && <EmotionReport trades={trades} />}
              {cat === 'asset' && <AssetReport trades={trades} />}
              {cat === 'streaks' && <StreaksReport trades={trades} />}
            </>
          )}
        </div>
      </div>
    </ProLock>
  );
}

/* ── RESUMEN GENERAL ── */
function GeneralReport({ trades }: { trades: Trade[] }) {
  const s = useMemo(() => {
    const wins = trades.filter(t => t.pnl > 0).length;
    const losses = trades.filter(t => t.pnl < 0).length;
    const be = trades.length - wins - losses;
    // Monthly evolution
    const byMonth = new Map<string, number>();
    for (const t of trades) {
      const m = t.date.slice(0, 7);
      byMonth.set(m, (byMonth.get(m) || 0) + t.pnl);
    }
    const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const best = months.length ? months.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;
    const worst = months.length ? months.reduce((a, b) => (b[1] < a[1] ? b : a)) : null;
    return {
      cum: getCumulativePnL(trades), n: trades.length,
      wr: getWinRate(trades, beCountsAsWin), pf: getProfitFactor(trades),
      wins, losses, be, months, best, worst,
    };
  }, [trades, beCountsAsWin]);

  const maxAbs = Math.max(...s.months.map(([, v]) => Math.abs(v)), 1);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div style={card}><div style={label}>Total Net PnL</div><div style={{ ...big, color: pnlColor(s.cum) }}>{fmt(s.cum)}</div></div>
        <div style={card}><div style={label}>Total operaciones</div><div style={big}>{s.n}</div></div>
        <div style={card}><div style={label}>Win rate global</div><div style={big}>{s.wr.toFixed(0)}%</div></div>
        <div style={card}><div style={label}>Profit factor</div><div style={big}>{isFinite(s.pf) ? s.pf.toFixed(2) : '∞'}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={card}>
          <div style={label}>Distribución W / L / BE</div>
          <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', margin: '12px 0' }}>
            <div style={{ flex: Math.max(0.02, s.wins), background: 'var(--blue)' }} />
            <div style={{ flex: Math.max(0.02, s.losses), background: 'var(--red)' }} />
            <div style={{ flex: Math.max(0.02, s.be), background: '#33334a' }} />
          </div>
          <div style={{ fontSize: 12, color: '#888898' }}>
            <span style={{ color: 'var(--blue)' }}>{s.wins} winners</span> · <span style={{ color: 'var(--red)' }}>{s.losses} losses</span> · {s.be} BE
          </div>
          <Watermark />
        </div>
        <div style={card}>
          <div style={label}>Mejor vs peor mes</div>
          {s.best && s.worst ? (
            <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: '#4a4a60' }}>{s.best[0]}</div>
                <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.2rem', color: 'var(--blue)' }}>{fmt(s.best[1])}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#4a4a60' }}>{s.worst[0]}</div>
                <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.2rem', color: 'var(--red)' }}>{fmt(s.worst[1])}</div>
              </div>
            </div>
          ) : <div style={{ fontSize: 12, color: '#4a4a60' }}>—</div>}
          <Watermark />
        </div>
      </div>

      <div style={card}>
        <div style={label}>Evolución mensual</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, paddingTop: 10 }}>
          {s.months.map(([m, v]) => (
            <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }} title={`${m}: ${fmt(v)}`}>
              <div style={{
                width: '70%', maxWidth: 48,
                height: Math.max(4, (Math.abs(v) / maxAbs) * 100),
                background: v >= 0 ? 'var(--blue)' : 'var(--red)',
                borderRadius: 4, opacity: 0.85,
              }} />
              <div style={{ fontSize: 9, color: '#4a4a60' }}>{m.slice(5)}</div>
            </div>
          ))}
        </div>
        <Watermark />
      </div>
    </>
  );
}

/* ── POR ESTRATEGIA ── */
function SetupReport({ trades }: { trades: Trade[] }) {
  const rows = useMemo(() => {
    const groups = groupBy(trades, t => t.setup || 'Sin setup');
    return [...groups.entries()]
      .map(([setup, list]) => ({ setup, ...statsFor(list) }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
        <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
          <tr style={{ fontSize: '0.62rem', color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {['Setup', 'Ops', 'Win %', 'PF', 'Avg Win', 'Avg Loss', 'Net PnL', 'Mejor / Peor'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Setup' ? 'left' : 'right', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isTop = i < 3 && r.pnl > 0;
            const isBottom = i >= rows.length - 3 && r.pnl < 0;
            return (
              <tr key={r.setup} style={{ borderTop: '1px solid var(--border-subtle, #1a1a1c)' }}>
                <td style={{ padding: '10px 14px', color: isTop ? 'var(--blue)' : isBottom ? 'var(--red)' : '#fff', fontWeight: 600 }}>{r.setup}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#888898' }}>{r.n}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#fff' }}>{r.wr.toFixed(0)}%</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#fff' }}>{isFinite(r.pf) ? r.pf.toFixed(2) : '∞'}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--blue)' }}>{fmt(r.aw)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--red)' }}>{fmt(r.al)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: pnlColor(r.pnl), fontWeight: 600 }}>{fmt(r.pnl)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11 }}>
                  <span style={{ color: 'var(--blue)' }}>{fmt(r.best)}</span> / <span style={{ color: 'var(--red)' }}>{fmt(r.worst)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Watermark />
    </div>
  );
}

/* ── POR SESIÓN ── */
function SessionReport({ trades }: { trades: Trade[] }) {
  const sessions = ['london', 'new_york', 'asia', 'premarket'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {sessions.map(sess => {
        const list = trades.filter(t => t.session === sess);
        const s = statsFor(list);
        return (
          <div key={sess} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>{SESSION_FLAG[sess]}</span>
              <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>{SESSION_LABEL[sess]}</span>
            </div>
            {list.length === 0 ? (
              <div style={{ fontSize: 12, color: '#33334a' }}>Sin operaciones en esta sesión</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <div style={label}>Net PnL</div>
                    <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.2rem', color: pnlColor(s.pnl) }}>{fmt(s.pnl)}</div>
                  </div>
                  <div>
                    <div style={label}>Ops / Win %</div>
                    <div style={{ fontSize: '0.9rem', color: '#fff' }}>{s.n} · {s.wr.toFixed(0)}%</div>
                  </div>
                  <div>
                    <div style={label}>PF</div>
                    <div style={{ fontSize: '0.9rem', color: '#fff' }}>{isFinite(s.pf) ? s.pf.toFixed(2) : '∞'}</div>
                  </div>
                </div>
              </>
            )}
            <Watermark />
          </div>
        );
      })}
    </div>
  );
}

/* ── POR DÍA DE LA SEMANA ── */
function WeekdayReport({ trades }: { trades: Trade[] }) {
  const data = useMemo(() => {
    const byDay: { day: string; pnl: number; wr: number; n: number }[] = [];
    for (let d = 1; d <= 7; d++) {
      const idx = d % 7; // Lun=1...Dom=0
      const list = trades.filter(t => new Date(`${t.date}T00:00:00`).getDay() === idx);
      const s = statsFor(list);
      byDay.push({ day: WEEKDAYS[idx], pnl: s.pnl, wr: s.wr, n: s.n });
    }
    return byDay;
  }, [trades]);

  const maxAbs = Math.max(...data.map(d => Math.abs(d.pnl)), 1);
  const withOps = data.filter(d => d.n > 0);
  const best = withOps.length ? withOps.reduce((a, b) => (b.pnl > a.pnl ? b : a)) : null;
  const worst = withOps.length ? withOps.reduce((a, b) => (b.pnl < a.pnl ? b : a)) : null;

  return (
    <>
      <div style={card}>
        <div style={label}>Net PnL por día de la semana</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160, paddingTop: 10 }}>
          {data.map(d => (
            <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 10, color: pnlColor(d.pnl) }}>{d.n > 0 ? fmt(d.pnl) : ''}</div>
              <div style={{
                width: '60%', maxWidth: 44,
                height: Math.max(4, (Math.abs(d.pnl) / maxAbs) * 110),
                background: d.n === 0 ? '#1a1a1c' : d.pnl >= 0 ? 'var(--blue)' : 'var(--red)',
                borderRadius: 4,
              }} />
              <div style={{ fontSize: 10, color: '#888898' }}>{d.day.slice(0, 3)}</div>
              <div style={{ fontSize: 9, color: '#4a4a60' }}>{d.n > 0 ? `${d.wr.toFixed(0)}%` : '—'}</div>
            </div>
          ))}
        </div>
        <Watermark />
      </div>
      {best && worst && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={card}>
            <div style={label}>Tu mejor día</div>
            <div style={{ fontSize: '0.95rem', color: '#fff' }}>{best.day} con <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{fmt(best.pnl)}</span></div>
          </div>
          <div style={card}>
            <div style={label}>Tu peor día</div>
            <div style={{ fontSize: '0.95rem', color: '#fff' }}>{worst.day} con <span style={{ color: 'var(--red)', fontWeight: 700 }}>{fmt(worst.pnl)}</span></div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── POR HORARIO (Best Timestamps heatmap) ── */
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 - 22:00
type Metric = 'expectancy' | 'pnl' | 'winrate' | 'volume';

interface CellAgg { sum: number; n: number; wins: number; rTotal: number }

function HourReport({ trades }: { trades: Trade[] }) {
  const [metric, setMetric] = useState<Metric>('expectancy');

  const grid = useMemo(() => {
    const cells: CellAgg[][] = Array.from({ length: 7 }, () =>
      HOURS.map(() => ({ sum: 0, n: 0, wins: 0, rTotal: 0 })));
    for (const t of trades) {
      const day = new Date(`${t.date}T00:00:00`).getDay();
      const hour = parseInt(t.time.slice(0, 2), 10);
      const col = HOURS.indexOf(hour);
      if (col < 0) continue;
      const c = cells[day][col];
      c.sum += t.pnl; c.n += 1; if (t.pnl > 0) c.wins += 1;
      c.rTotal += (t.realRR || (t.pnl >= 0 ? 1 : -1));
    }
    return cells;
  }, [trades]);

  const cellMetric = (c: CellAgg): number | null => {
    if (c.n === 0) return null;
    switch (metric) {
      case 'expectancy': return c.rTotal / c.n;
      case 'pnl': return c.sum;
      case 'winrate': return (c.wins / c.n) * 100;
      case 'volume': return c.n;
    }
  };
  const allVals = grid.flat().map(cellMetric).filter((v): v is number => v !== null);
  const maxAbs = Math.max(...allVals.map(Math.abs), 1);

  const cellColor = (v: number | null) => {
    if (v === null) return '#1a1a1c';
    if (metric === 'volume' || metric === 'winrate') {
      const norm = metric === 'winrate' ? (v - 50) / 50 : v / maxAbs;
      return norm >= 0 ? `rgba(79,143,255,${0.15 + Math.min(1, Math.abs(norm)) * 0.5})` : `rgba(239,68,68,${0.15 + Math.min(1, Math.abs(norm)) * 0.5})`;
    }
    const norm = v / maxAbs;
    return v >= 0 ? `rgba(79,143,255,${0.15 + Math.min(1, Math.abs(norm)) * 0.55})` : `rgba(239,68,68,${0.15 + Math.min(1, Math.abs(norm)) * 0.55})`;
  };

  // Best / worst window (by expectancy, min 2 ops)
  const windows: { day: number; hour: number; agg: CellAgg }[] = [];
  grid.forEach((row, d) => row.forEach((c, h) => { if (c.n >= 2) windows.push({ day: d, hour: HOURS[h], agg: c }); }));
  const byExp = [...windows].sort((a, b) => (b.agg.rTotal / b.agg.n) - (a.agg.rTotal / a.agg.n));
  const best = byExp[0], worst = byExp[byExp.length - 1];

  // Hour & weekday breakdowns
  const hourAgg = HOURS.map((_, hi) => {
    let rTotal = 0, n = 0;
    grid.forEach(row => { rTotal += row[hi].rTotal; n += row[hi].n; });
    return { hour: HOURS[hi], exp: n ? rTotal / n : 0, n };
  });
  const dayAgg = grid.map((row, d) => {
    const r = row.reduce((s, c) => s + c.rTotal, 0), n = row.reduce((s, c) => s + c.n, 0);
    return { day: d, exp: n ? r / n : 0, n };
  });
  const maxHourExp = Math.max(...hourAgg.map(h => Math.abs(h.exp)), 0.1);
  const maxDayExp = Math.max(...dayAgg.map(h => Math.abs(h.exp)), 0.1);

  const fmtMetric = (c: CellAgg) => {
    const v = cellMetric(c);
    if (v === null) return '';
    if (metric === 'pnl') return fmt(v);
    if (metric === 'winrate') return `${Math.round(v)}%`;
    if (metric === 'volume') return String(v);
    return (v >= 0 ? '+' : '') + v.toFixed(1) + 'R';
  };

  if (trades.length === 0) return <EmptyReport />;

  return (
    <>
      {/* Hero best/worst */}
      {best && worst && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <WindowCard title="Tu mejor ventana" agg={best.agg} day={best.day} hour={best.hour} accent="#4f8fff" />
          <WindowCard title="Tu peor ventana" agg={worst.agg} day={worst.day} hour={worst.hour} accent="#ef4444" />
        </div>
      )}

      {/* Heatmap */}
      <div style={{ ...card, overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ ...label, marginBottom: 0 }}>Performance por hora y día</div>
          <div style={{ display: 'inline-flex', background: '#0d0d0f', border: '1px solid #1e1e20', borderRadius: 18, padding: 3, gap: 2 }}>
            {([['expectancy', 'Expectancy'], ['pnl', 'Net PnL'], ['winrate', 'Win %'], ['volume', 'Volumen']] as [Metric, string][]).map(([m, l]) => (
              <button key={m} onClick={() => setMetric(m)} style={{ padding: '4px 11px', borderRadius: 14, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", background: metric === m ? '#1e1e28' : 'transparent', border: metric === m ? '1px solid #2a2a35' : '1px solid transparent', color: metric === m ? '#fff' : '#4a4a60' }}>{l}</button>
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
                <div key={h} title={c.n ? `${WEEKDAYS[d]} ${HOURS[h]}h · ${c.n} ops · WR ${Math.round((c.wins / c.n) * 100)}% · ${fmt(c.sum)}` : ''}
                  style={{ height: 34, background: cellColor(cellMetric(c)), borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: c.n ? '#fff' : 'transparent', fontFamily: "'Space Grotesk', sans-serif" }}>
                  {c.n ? fmtMetric(c) : ''}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
        <Watermark />
      </div>

      {/* Hour & weekday bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
        <div style={card}>
          <div style={label}>Expectancy por hora</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 120, paddingTop: 10 }}>
            {hourAgg.map(h => (
              <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={`${h.hour}h · ${h.exp.toFixed(2)}R`}>
                <div style={{ width: '70%', height: Math.max(2, (Math.abs(h.exp) / maxHourExp) * 90), background: h.n === 0 ? '#1a1a1c' : h.exp >= 0 ? 'var(--blue)' : 'var(--red)', borderRadius: 3 }} />
                <div style={{ fontSize: 8, color: '#4a4a60', marginTop: 3 }}>{h.hour}</div>
              </div>
            ))}
          </div>
          <Watermark />
        </div>
        <div style={card}>
          <div style={label}>Expectancy por día</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 120, paddingTop: 10 }}>
            {dayAgg.map(d => (
              <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={`${WEEKDAYS[d.day]} · ${d.exp.toFixed(2)}R`}>
                <div style={{ width: '60%', height: Math.max(2, (Math.abs(d.exp) / maxDayExp) * 90), background: d.n === 0 ? '#1a1a1c' : d.exp >= 0 ? 'var(--blue)' : 'var(--red)', borderRadius: 3 }} />
                <div style={{ fontSize: 8, color: '#4a4a60', marginTop: 3 }}>{WEEKDAYS[d.day].slice(0, 1)}</div>
              </div>
            ))}
          </div>
          <Watermark />
        </div>
      </div>

      {/* Insights */}
      {best && worst && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <InsightCard icon="💡" text={`Tus mejores trades ocurren los ${WEEKDAYS[best.day]} a las ${best.hour}:00 — expectancy de ${(best.agg.rTotal / best.agg.n).toFixed(1)}R en ${best.agg.n} ops.`} />
          {(worst.agg.rTotal / worst.agg.n) < 0 && <InsightCard icon="⚠️" text={`Pierdes los ${WEEKDAYS[worst.day]} a las ${worst.hour}:00 (${(worst.agg.rTotal / worst.agg.n).toFixed(1)}R). Considera no operar en esa ventana.`} />}
        </div>
      )}
    </>
  );
}

function WindowCard({ title, agg, day, hour, accent }: { title: string; agg: CellAgg; day: number; hour: number; accent: string }) {
  const exp = agg.rTotal / agg.n;
  return (
    <div style={{ ...card, borderColor: `${accent}33` }}>
      <div style={{ ...label, color: accent }}>{title}</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.3rem', color: '#fff', margin: '6px 0 12px' }}>{WEEKDAYS[day]} · {hour}:00-{hour + 1}:00</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <Mini label="Win rate" value={`${Math.round((agg.wins / agg.n) * 100)}%`} />
        <Mini label="Operaciones" value={String(agg.n)} />
        <Mini label="Expectancy" value={`${exp >= 0 ? '+' : ''}${exp.toFixed(1)}R`} color={accent} />
        <Mini label="Net PnL" value={fmt(agg.sum)} color={agg.sum >= 0 ? 'var(--blue)' : 'var(--red)'} />
      </div>
      <Watermark />
    </div>
  );
}
function Mini({ label: l, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.58rem', color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
      <div style={{ fontSize: '0.9rem', color: color || '#fff', marginTop: 3, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
function InsightCard({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ ...card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: '0.85rem', color: '#c8d4e8', lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

/* ── POR ESTADO EMOCIONAL ── */
function EmotionReport({ trades }: { trades: Trade[] }) {
  const data = useMemo(() => {
    return [1, 2, 3, 4, 5].map(e => {
      const list = trades.filter(t => t.emotionalState === e);
      return { e, ...statsFor(list) };
    });
  }, [trades]);
  const withOps = data.filter(d => d.n > 0);
  const best = withOps.length ? withOps.reduce((a, b) => (b.wr > a.wr ? b : a)) : null;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {data.map(d => {
          const isBest = best && d.e === best.e && d.n > 0;
          return (
            <div key={d.e} style={{ ...card, textAlign: 'center', borderColor: isBest ? 'rgba(79,143,255,0.35)' : 'var(--border)' }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>{EMOJIS[d.e]}</div>
              {d.n === 0 ? (
                <div style={{ fontSize: 11, color: '#33334a' }}>Sin trades</div>
              ) : (
                <>
                  <div style={{ fontSize: 11, color: '#888898' }}>{d.n} ops · {d.wr.toFixed(0)}%</div>
                  <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '0.95rem', color: pnlColor(d.pnl), marginTop: 4 }}>{fmt(d.pnl)}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
      {best && (
        <div style={{ ...card, borderColor: 'rgba(79,143,255,0.2)' }}>
          <div style={{ fontSize: '0.85rem', color: '#fff' }}>
            💡 Cuando operas en estado {EMOJIS[best.e]}, tu win rate es del <b style={{ color: 'var(--blue)' }}>{best.wr.toFixed(0)}%</b>
          </div>
        </div>
      )}
    </>
  );
}

/* ── POR ACTIVO ── */
function AssetReport({ trades }: { trades: Trade[] }) {
  const rows = useMemo(() => {
    const groups = groupBy(trades, t => t.asset);
    return [...groups.entries()]
      .map(([asset, list]) => ({ asset, ...statsFor(list), avg: list.reduce((s, t) => s + t.pnl, 0) / list.length }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
        <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
          <tr style={{ fontSize: '0.62rem', color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {['Activo', 'Operaciones', 'Win %', 'Net PnL', 'Avg PnL/trade'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Activo' ? 'left' : 'right', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.asset} style={{ borderTop: '1px solid #1a1a1c' }}>
              <td style={{ padding: '10px 14px', color: '#fff', fontWeight: 600 }}>{r.asset}</td>
              <td style={{ padding: '10px 14px', textAlign: 'right', color: '#888898' }}>{r.n}</td>
              <td style={{ padding: '10px 14px', textAlign: 'right', color: '#fff' }}>{r.wr.toFixed(0)}%</td>
              <td style={{ padding: '10px 14px', textAlign: 'right', color: pnlColor(r.pnl), fontWeight: 600 }}>{fmt(r.pnl)}</td>
              <td style={{ padding: '10px 14px', textAlign: 'right', color: pnlColor(r.avg) }}>{fmt(r.avg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Watermark />
    </div>
  );
}

/* ── DRAWDOWN Y RACHAS ── */
function StreaksReport({ trades }: { trades: Trade[] }) {
  const s = useMemo(() => {
    const sorted = [...trades].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    let bestWinStreak = 0, bestLossStreak = 0;
    let curWin = 0, curLoss = 0;
    let winStreakPnl = 0, lossStreakPnl = 0, curWinPnl = 0, curLossPnl = 0;
    for (const t of sorted) {
      if (t.pnl > 0) {
        curWin += 1; curWinPnl += t.pnl;
        curLoss = 0; curLossPnl = 0;
        if (curWin > bestWinStreak) { bestWinStreak = curWin; winStreakPnl = curWinPnl; }
      } else if (t.pnl < 0) {
        curLoss += 1; curLossPnl += t.pnl;
        curWin = 0; curWinPnl = 0;
        if (curLoss > bestLossStreak) { bestLossStreak = curLoss; lossStreakPnl = curLossPnl; }
      }
    }
    // current streak (from end)
    let current = 0; let currentType: 'win' | 'loss' | null = null;
    for (let i = sorted.length - 1; i >= 0; i--) {
      const t = sorted[i];
      if (t.pnl === 0) break;
      const type = t.pnl > 0 ? 'win' : 'loss';
      if (currentType === null) currentType = type;
      if (type !== currentType) break;
      current += 1;
    }
    const dd = getMaxDrawdown(trades);
    const cum = getCumulativePnL(trades);
    return { bestWinStreak, bestLossStreak, winStreakPnl, lossStreakPnl, current, currentType, dd, cum };
  }, [trades]);

  return (
    <>
      <div style={card}>
        <div style={label}>Drawdown máximo</div>
        <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2rem', color: 'var(--red)' }}>-€{Math.round(s.dd).toLocaleString('en-US')}</div>
        <div style={{ fontSize: 12, color: '#4a4a60', marginTop: 4 }}>
          {s.cum !== 0 ? `${((s.dd / Math.abs(s.cum + s.dd)) * 100).toFixed(0)}% relativo al pico de equity` : ''}
        </div>
        <Watermark />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={card}>
          <div style={label}>Racha ganadora más larga</div>
          <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.6rem', color: 'var(--blue)' }}>{s.bestWinStreak}</div>
          <div style={{ fontSize: 12, color: '#888898' }}>trades · {fmt(s.winStreakPnl)}</div>
        </div>
        <div style={card}>
          <div style={label}>Racha perdedora más larga</div>
          <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.6rem', color: 'var(--red)' }}>{s.bestLossStreak}</div>
          <div style={{ fontSize: 12, color: '#888898' }}>trades · {fmt(s.lossStreakPnl)}</div>
        </div>
        <div style={card}>
          <div style={label}>Racha actual</div>
          <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.6rem', color: s.currentType === 'win' ? 'var(--blue)' : s.currentType === 'loss' ? 'var(--red)' : '#fff' }}>
            {s.current}
          </div>
          <div style={{ fontSize: 12, color: '#888898' }}>
            {s.currentType === 'win' ? 'ganando' : s.currentType === 'loss' ? 'perdiendo' : '—'}
          </div>
        </div>
      </div>
    </>
  );
}

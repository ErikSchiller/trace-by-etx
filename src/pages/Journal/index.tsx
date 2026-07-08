import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUserTrades, groupTradesByDate, type Trade } from '../../store/tradeStore';

const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, transition: 'border-color 0.15s ease' };
const mono: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" };
const syne: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };

function fmtMoney(n: number) {
  return `${n >= 0 ? '+' : '-'}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}
function fmtLongDate(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function DayChart({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) return <div style={{ height: 140 }} />;
  const sorted = [...trades].sort((a, b) => a.time.localeCompare(b.time));
  let cum = 0;
  const points = sorted.map(t => { cum += t.pnl; return cum; });
  const max = Math.max(...points, 0), min = Math.min(...points, 0);
  const range = max - min || 1;
  const positive = cum >= 0;
  const color = positive ? 'var(--blue)' : 'var(--red)';
  const colorRgb = positive ? '79,143,255' : '239,68,68';
  const path = points.map((p, i) => {
    const x = (i / Math.max(1, points.length - 1)) * 270;
    const y = 90 - ((p - min) / range) * 80;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const id = `dg-${trades[0].id}`;
  return (
    <svg width="100%" height="140" viewBox="0 0 270 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`rgb(${colorRgb})`} stopOpacity="0.35" />
          <stop offset="100%" stopColor={`rgb(${colorRgb})`} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[25, 50, 75].map(y => <line key={y} x1="0" y1={y} x2="270" y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="2 4" />)}
      <polygon points={`0,100 ${path} 270,100`} fill={`url(#${id})`} />
      <polyline points={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 7, padding: '8px 10px' }}>
      <div style={{ fontSize: '0.6rem', color: '#3a3a55', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{label}</div>
      <div style={{ ...mono, fontSize: '0.82rem', color: color || '#fff', marginTop: 4 }}>{value}</div>
    </div>
  );
}

function dayStats(trades: Trade[]) {
  const ops = trades.length;
  const win = trades.filter(t => t.pnl > 0).length;
  const lose = trades.filter(t => t.pnl < 0).length;
  const gross = trades.reduce((s, t) => s + t.grossPnl, 0);
  const comm = trades.reduce((s, t) => s + (t.commission || 0), 0);
  const wr = ops > 0 ? (win / ops) * 100 : 0;
  const vol = trades.reduce((s, t) => s + t.positionSize, 0);
  const wins = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const losses = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  const pf = losses === 0 ? (wins > 0 ? Infinity : 0) : wins / losses;
  return { ops, win, lose, gross, comm, wr, vol, pf };
}

export function Journal() {
  const trades = useUserTrades();
  const [searchParams] = useSearchParams();
  const focusDate = searchParams.get('date');

  const grouped = useMemo(() => groupTradesByDate(trades), [trades]);
  const days = useMemo(() => Object.keys(grouped).sort((a, b) => b.localeCompare(a)), [grouped]);

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    if (focusDate && grouped[focusDate]) init[focusDate] = true;
    else if (days[0]) init[days[0]] = true;
    return init;
  });

  const toggleAll = (state: boolean) => {
    const next: Record<string, boolean> = {};
    days.forEach(d => { next[d] = state; });
    setOpen(next);
  };

  if (days.length === 0) {
    return (
      <div style={{ padding: '20px 24px' }}>
        <div style={{ ...card, padding: 40, textAlign: 'center' }}>
          <div style={{ ...syne, fontWeight: 800, fontSize: 18, color: '#fff', marginBottom: 8 }}>
            Aún no hay días con operaciones
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>
            Cuando registres operaciones, aquí verás tu diario diario.
          </div>
        </div>
      </div>
    );
  }

  // Mini calendar — current month based on most recent trade
  const lastDate = days[0];
  const refDate = new Date(`${lastDate}T00:00:00`);
  const calY = refDate.getFullYear(), calM = refDate.getMonth();
  const firstDay = new Date(calY, calM, 1).getDay();
  const daysInMonth = new Date(calY, calM + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthName = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][calM];

  return (
    <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => toggleAll(false)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 11, padding: '5px 10px', borderRadius: 5, cursor: 'pointer' }}>Colapsar todo</button>
            <button onClick={() => toggleAll(true)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 11, padding: '5px 10px', borderRadius: 5, cursor: 'pointer' }}>Expandir todo</button>
          </div>
          <button style={{ background: 'var(--blue)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🚀 Iniciar mi día</button>
        </div>

        {days.map(date => {
          const dayTrades = grouped[date];
          const isOpen = !!open[date];
          const stats = dayStats(dayTrades);
          const dayPnl = dayTrades.reduce((s, t) => s + t.pnl, 0);
          const pos = dayPnl >= 0;
          return (
            <div key={date} id={`day-${date}`} style={card}>
              <button
                onClick={() => setOpen(o => ({ ...o, [date]: !isOpen }))}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 18px', background: 'transparent', border: 'none',
                  borderBottom: isOpen ? '1px solid var(--dim)' : 'none',
                  cursor: 'pointer', color: 'var(--text)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▶</span>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fff' }}>{fmtLongDate(date)}</span>
                  <span style={{ ...mono, fontSize: '0.88rem', color: pos ? 'var(--blue)' : 'var(--red)' }}>{fmtMoney(dayPnl)}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {stats.ops} ops</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 5 }}>
                  📝 Añadir nota
                </span>
              </button>
              {isOpen && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '16px 18px' }}>
                  <DayChart trades={dayTrades} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <StatCell label="Total ops" value={String(stats.ops)} />
                    <StatCell label="Winners" value={String(stats.win)} color="var(--blue)" />
                    <StatCell label="Losers" value={String(stats.lose)} color="var(--red)" />
                    <StatCell label="Gross PnL" value={fmtMoney(stats.gross)} color={stats.gross >= 0 ? 'var(--blue)' : 'var(--red)'} />
                    <StatCell label="Comisiones" value={`$${stats.comm.toFixed(0)}`} />
                    <StatCell label="Win rate" value={`${stats.wr.toFixed(0)}%`} />
                    <StatCell label="Volumen" value={String(stats.vol)} />
                    <StatCell label="Profit Factor" value={isFinite(stats.pf) ? stats.pf.toFixed(2) : '∞'} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mini calendar */}
      <div style={{ ...card, padding: 8, position: 'sticky', top: 8, alignSelf: 'flex-start' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>‹</span>
          <div style={{ ...syne, fontWeight: 700, fontSize: 11, color: '#fff' }}>{monthName} {calY}</div>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>›</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => (
            <div key={d} style={{ fontSize: 8, color: 'var(--muted)', textAlign: 'center', padding: '2px 0' }}>{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} style={{ height: 24 }} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateKey = `${calY}-${String(calM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayPnl = grouped[dateKey]?.reduce((s, t) => s + t.pnl, 0);
            const has = dayPnl !== undefined;
            const pos = has && dayPnl >= 0;
            const neg = has && dayPnl < 0;
            const isToday = dateKey === todayStr;
            return (
              <div
                key={day}
                onClick={() => has && setOpen(o => ({ ...o, [dateKey]: true }))}
                style={{
                  height: 24, borderRadius: 3,
                  background: pos ? 'rgba(79,143,255,0.12)' : neg ? 'rgba(239,68,68,0.10)' : 'transparent',
                  border: isToday ? '1px solid var(--blue)' : '1px solid transparent',
                  fontSize: 9, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: has ? 'pointer' : 'default',
                  ...mono,
                }}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Journal;

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUserTrades, groupTradesByDate, type Trade } from '../../store/tradeStore';
import { HeatmapCalendar, type HeatCell } from '../../components/Charts/HeatmapCalendar';
import { LineChart } from '../../components/Charts/LineChart';
import { Tabs } from '../../components/UI/Tabs';
import { Badge } from '../../components/UI/Badge';
import { Button } from '../../components/UI/Button';
import { TradeDetailModal } from '../../components/Modals/TradeDetailModal';

const syne: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const body: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" };
const cardStyle: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border-subtle)',
  borderRadius: 12, transition: 'border-color 0.15s ease',
};

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const WEEKDAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function fmtMoney(n: number) { return `${n >= 0 ? '+' : '-'}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`; }
function dayNum(date: string) { return new Date(`${date}T00:00:00`).getDate(); }
function monthShortLabel(date: string) { const d = new Date(`${date}T00:00:00`); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; }
function weekday(date: string) { return WEEKDAYS_LONG[new Date(`${date}T00:00:00`).getDay()]; }

const SESSION_LABEL: Record<string, string> = { london: 'Londres', new_york: 'NY', asia: 'Asia', premarket: 'Pre' };

function dayStats(trades: Trade[]) {
  const ops = trades.length;
  const win = trades.filter(t => t.pnl > 0).length;
  const lose = trades.filter(t => t.pnl < 0).length;
  const be = ops - win - lose;
  const wr = ops > 0 ? (win / ops) * 100 : 0;
  const vol = trades.reduce((s, t) => s + t.positionSize, 0);
  const sessions = [...new Set(trades.map(t => SESSION_LABEL[t.session] ?? t.session))];
  return { ops, win, lose, be, wr, vol, sessions };
}

export function Journal() {
  const trades = useUserTrades();
  const [searchParams] = useSearchParams();
  const focusDate = searchParams.get('date');

  const grouped = useMemo(() => groupTradesByDate(trades), [trades]);
  const allDays = useMemo(() => Object.keys(grouped).sort((a, b) => b.localeCompare(a)), [grouped]);

  const [view, setView] = useState<'diario' | 'mensual'>('diario');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(focusDate ?? null);

  // Month navigation — default to focusDate / most recent trade / today.
  const [cal, setCal] = useState(() => {
    const ref = focusDate ?? allDays[0] ?? new Date().toISOString().slice(0, 10);
    const d = new Date(`${ref}T00:00:00`);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const monthPrefix = `${cal.y}-${String(cal.m + 1).padStart(2, '0')}`;
  const monthDays = useMemo(() => allDays.filter(d => d.startsWith(monthPrefix)), [allDays, monthPrefix]);

  // Heatmap cells for the month (with leading placeholders).
  const heatCells = useMemo<HeatCell[]>(() => {
    const firstWeekday = new Date(cal.y, cal.m, 1).getDay();
    const total = new Date(cal.y, cal.m + 1, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);
    const cells: HeatCell[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ date: `p${i}`, day: 0, pnl: null });
    for (let day = 1; day <= total; day++) {
      const date = `${monthPrefix}-${String(day).padStart(2, '0')}`;
      const dt = grouped[date];
      cells.push({ date, day, pnl: dt ? dt.reduce((s, t) => s + t.pnl, 0) : null, isToday: date === todayStr });
    }
    return cells;
  }, [cal, monthPrefix, grouped]);

  // Month summary.
  const summary = useMemo(() => {
    const mt = trades.filter(t => t.date.startsWith(monthPrefix));
    const net = mt.reduce((s, t) => s + t.pnl, 0);
    const wins = mt.filter(t => t.pnl > 0).length;
    const wr = mt.length ? (wins / mt.length) * 100 : 0;
    const byDay: Record<string, number> = {};
    mt.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl; });
    const entries = Object.entries(byDay);
    const best = entries.length ? entries.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;
    const worst = entries.length ? entries.reduce((a, b) => (b[1] < a[1] ? b : a)) : null;
    return { net, wr, best, worst, ops: mt.length };
  }, [trades, monthPrefix]);

  const gotoDay = (date: string) => {
    setSelectedDay(date);
    setExpanded(e => ({ ...e, [date]: true }));
    setView('diario');
    setTimeout(() => document.getElementById(`day-${date}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  // Deep-link: expand + scroll to focusDate once.
  const didFocus = useRef(false);
  useEffect(() => {
    if (focusDate && grouped[focusDate] && !didFocus.current) {
      didFocus.current = true;
      gotoDay(focusDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDate, grouped]);

  const prevMonth = () => setCal(c => ({ y: c.m === 0 ? c.y - 1 : c.y, m: c.m === 0 ? 11 : c.m - 1 }));
  const nextMonth = () => setCal(c => ({ y: c.m === 11 ? c.y + 1 : c.y, m: c.m === 11 ? 0 : c.m + 1 }));

  if (allDays.length === 0) {
    return (
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ ...cardStyle, padding: 48, textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📓</div>
          <div style={{ ...syne, fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>
            Aún no tienes operaciones registradas
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
            Empieza a registrar para construir tu diario día a día.
          </div>
          <Button variant="primary" onClick={() => window.dispatchEvent(new CustomEvent('trace:open-add-trade'))}>
            ＋ Añadir tu primera operación
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{ ...syne, fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>Diario Diario</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={prevMonth} style={navBtn}>‹</button>
          <div style={{ ...syne, fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', minWidth: 118, textAlign: 'center' }}>{MONTHS[cal.m]} {cal.y}</div>
          <button onClick={nextMonth} style={navBtn}>›</button>
        </div>
        <div style={{ minWidth: 190 }}>
          <Tabs
            items={[{ value: 'diario', label: 'Diario' }, { value: 'mensual', label: 'Mensual' }]}
            value={view}
            onChange={v => setView(v)}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: view === 'mensual' ? '1fr' : '280px 1fr', gap: 20, alignItems: 'start' }}>
        {/* LEFT — calendar + summary */}
        {view === 'diario' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 8 }}>
            <div style={{ ...cardStyle, padding: 16 }}>
              <HeatmapCalendar cells={heatCells} selected={selectedDay} onSelect={gotoDay} compact />
            </div>
            <MonthSummary summary={summary} />
          </div>
        )}

        {/* RIGHT — day entries OR full month */}
        {view === 'mensual' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
            <div style={{ ...cardStyle, padding: 20 }}>
              <HeatmapCalendar cells={heatCells} selected={selectedDay} onSelect={gotoDay} formatValue={fmtMoney} />
            </div>
            <MonthSummary summary={summary} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {monthDays.length === 0 ? (
              <div style={{ ...cardStyle, padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                Sin operaciones en {MONTHS[cal.m]} {cal.y}.
              </div>
            ) : (
              monthDays.map(date => (
                <DayCard
                  key={date}
                  date={date}
                  trades={grouped[date]}
                  expanded={!!expanded[date]}
                  onToggle={() => setExpanded(e => ({ ...e, [date]: !e[date] }))}
                  onOpenTrade={setDetailId}
                />
              ))
            )}
          </div>
        )}
      </div>

      <TradeDetailModal trade={trades.find(t => t.id === detailId) ?? null} onClose={() => setDetailId(null)} />
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border-subtle)',
  background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 15, lineHeight: 1,
};

function MonthSummary({ summary }: { summary: { net: number; wr: number; best: [string, number] | null; worst: [string, number] | null; ops: number } }) {
  const rows: [string, string, string?][] = [
    ['Net PnL', fmtMoney(summary.net), summary.net >= 0 ? 'var(--blue)' : 'var(--red)'],
    ['Win rate', `${summary.wr.toFixed(0)}%`, 'var(--text-primary)'],
    ['Mejor día', summary.best ? `${monthShortLabel(summary.best[0])} · ${fmtMoney(summary.best[1])}` : '—', 'var(--blue)'],
    ['Peor día', summary.worst ? `${monthShortLabel(summary.worst[0])} · ${fmtMoney(summary.worst[1])}` : '—', summary.worst && summary.worst[1] < 0 ? 'var(--red)' : 'var(--text-secondary)'],
  ];
  return (
    <div style={{ ...cardStyle, padding: '16px 18px' }}>
      <div style={{ ...syne, fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: 12 }}>Resumen del mes</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(([label, value, color]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ ...body, fontSize: '0.8rem', fontWeight: 600, color: color ?? 'var(--text-primary)' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayCard({ date, trades, expanded, onToggle, onOpenTrade }: {
  date: string; trades: Trade[]; expanded: boolean; onToggle: () => void; onOpenTrade: (id: string) => void;
}) {
  const stats = dayStats(trades);
  const dayPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const pos = dayPnl >= 0;
  const curve = useMemo(() => {
    const sorted = [...trades].sort((a, b) => a.time.localeCompare(b.time));
    let cum = 0;
    return sorted.map(t => { cum += t.pnl; return { value: cum }; });
  }, [trades]);

  return (
    <div id={`day-${date}`} style={{ ...cardStyle, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, scrollMarginTop: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ ...syne, fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{dayNum(date)} {MONTHS[new Date(`${date}T00:00:00`).getMonth()]}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{weekday(date)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ ...syne, fontWeight: 800, fontSize: '1.4rem', color: pos ? 'var(--blue)' : 'var(--red)' }}>{fmtMoney(dayPnl)}</span>
          <Badge variant="neutral">{stats.ops} {stats.ops === 1 ? 'op' : 'ops'}</Badge>
        </div>
      </div>

      {/* Stats subrow */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden' }}>
        <SubStat label="Resultado" value={`${stats.win}W · ${stats.lose}L · ${stats.be}BE`} />
        <SubStat label="Win rate" value={`${stats.wr.toFixed(0)}%`} border />
        <SubStat label="Volumen" value={`${stats.vol} contr.`} border />
        <SubStat label="Sesiones" value={stats.sessions.join(', ') || '—'} border />
      </div>

      {/* Mini equity line */}
      {curve.length >= 2 && (
        <div><LineChart data={curve} height={40} color={pos ? 'var(--blue)' : 'var(--red)'} showGrid={false} showPeak={false} /></div>
      )}

      {/* Trades table (collapsible) */}
      <div>
        <button onClick={onToggle} style={{
          background: 'transparent', border: 'none', color: 'var(--blue)', cursor: 'pointer',
          fontSize: '0.75rem', fontWeight: 600, ...body, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          Ver {stats.ops} {stats.ops === 1 ? 'operación' : 'operaciones'}
          <span style={{ display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', fontSize: 9 }}>▾</span>
        </button>
        {expanded && (
          <div style={{ marginTop: 10, border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden' }}>
            {[...trades].sort((a, b) => a.time.localeCompare(b.time)).map((t, i) => {
              const status = t.pnl > 0 ? 'ganancia' : t.pnl < 0 ? 'perdida' : 'breakEven';
              const statusLabel = t.pnl > 0 ? 'WIN' : t.pnl < 0 ? 'LOSS' : 'BE';
              return (
                <div key={t.id} onClick={() => onOpenTrade(t.id)}
                  className="diario-trow"
                  style={{
                    display: 'grid', gridTemplateColumns: '52px 1fr 64px 90px 1fr 64px', gap: 8, alignItems: 'center',
                    padding: '8px 12px', fontSize: '0.78rem', cursor: 'pointer',
                    borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none', ...body,
                  }}>
                  <span style={{ color: 'var(--text-muted)' }}>{t.time}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{t.asset}</span>
                  <Badge variant={t.direction === 'long' ? 'ganancia' : 'perdida'}>{t.direction === 'long' ? 'LONG' : 'SHORT'}</Badge>
                  <span style={{ color: t.pnl >= 0 ? 'var(--blue)' : 'var(--red)', fontWeight: 600, textAlign: 'right' }}>{fmtMoney(t.pnl)}</span>
                  <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.setup || '—'}</span>
                  <Badge variant={status}>{statusLabel}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day note placeholder (no note store yet) */}
      <button style={{
        alignSelf: 'flex-start', background: 'transparent', border: '1px dashed var(--border)',
        color: 'var(--text-muted)', borderRadius: 8, padding: '7px 12px', fontSize: '0.72rem',
        cursor: 'pointer', ...body,
      }}>＋ Añadir nota del día</button>
    </div>
  );
}

function SubStat({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <div style={{ padding: '10px 12px', borderLeft: border ? '1px solid var(--border-subtle)' : 'none' }}>
      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ ...body, fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  );
}

export default Journal;

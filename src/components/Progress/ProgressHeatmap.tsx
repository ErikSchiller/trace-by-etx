import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoutineStore, dayRatio } from '../../store/routineStore';
import { useUserTrades } from '../../store/tradeStore';

const HEAD = "'Syne', sans-serif";
const BODY = "'Space Grotesk', sans-serif";
const C = { card: '#15171d', border: '#1e2029', bg: '#0a0a0c', blue: '#4f8fff', red: '#ef4444', text: '#f7f8fa', text2: '#c8d4e8', muted: '#6b7280' };
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DOW_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

type View = 'year' | 'month' | '30d';
const key = (d: Date) => d.toISOString().slice(0, 10);
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7; // Mon=0 .. Sun=6

function cellColor(ratio: number, hasData: boolean): string {
  if (!hasData || ratio <= 0) return 'rgba(255,255,255,0.035)';
  if (ratio < 0.34) return 'rgba(79,143,255,0.22)';
  if (ratio < 0.67) return 'rgba(79,143,255,0.45)';
  if (ratio < 1) return 'rgba(79,143,255,0.7)';
  return '#4f8fff';
}

interface DayInfo { date: string; ratio: number; done: number; total: number; trades: number; pnl: number; inRange: boolean; future: boolean }

export function ProgressHeatmap({ initialView = 'year' }: { initialView?: View }) {
  const routine = useRoutineStore(s => s.routine);
  const completions = useRoutineStore(s => s.completions);
  const trades = useUserTrades();
  const navigate = useNavigate();
  const [view, setView] = useState<View>(initialView);
  const [hover, setHover] = useState<{ info: DayInfo; x: number; y: number } | null>(null);

  const habitTotal = routine?.habits.length ?? 0;

  // Per-day PnL / trade count.
  const byDay = useMemo(() => {
    const m: Record<string, { pnl: number; n: number }> = {};
    trades.forEach(t => { const e = m[t.date] ?? { pnl: 0, n: 0 }; e.pnl += t.pnl; e.n += 1; m[t.date] = e; });
    return m;
  }, [trades]);

  const info = (d: Date, inRange: boolean): DayInfo => {
    const k = key(d);
    const done = (completions[k] ?? []).filter(id => routine?.habits.some(h => h.id === id)).length;
    const td = byDay[k];
    const today = key(new Date());
    return { date: k, ratio: dayRatio(routine, completions[k]), done, total: habitTotal, trades: td?.n ?? 0, pnl: td?.pnl ?? 0, inRange, future: k > today };
  };

  // Build the week-column grid for the active view.
  const { columns, monthLabels } = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;
    if (view === 'year') { start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear(), 11, 31); }
    else if (view === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 0); }
    else { end = new Date(now); start = new Date(now); start.setDate(now.getDate() - 29); }
    // pad to Monday..Sunday
    const gridStart = new Date(start); gridStart.setDate(start.getDate() - mondayIndex(start));
    const gridEnd = new Date(end); gridEnd.setDate(end.getDate() + (6 - mondayIndex(end)));

    const cols: DayInfo[][] = [];
    const labels: { col: number; text: string }[] = [];
    let cur = new Date(gridStart); let lastMonth = -1;
    while (cur <= gridEnd) {
      const week: DayInfo[] = [];
      for (let r = 0; r < 7; r++) {
        const inRange = cur >= start && cur <= end;
        week.push(info(new Date(cur), inRange));
        if (r === 0 && inRange && cur.getMonth() !== lastMonth) { labels.push({ col: cols.length, text: MONTHS[cur.getMonth()] }); lastMonth = cur.getMonth(); }
        cur.setDate(cur.getDate() + 1);
      }
      cols.push(week);
    }
    return { columns: cols, monthLabels: labels };
  }, [view, completions, byDay, routine]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stats.
  const stats = useMemo(() => {
    const dates = Object.keys(completions).filter(k => (completions[k] ?? []).length > 0).sort();
    const completed = dates.filter(k => dayRatio(routine, completions[k]) >= 1);
    // streaks of fully-completed days
    const doneSet = new Set(completed);
    const streakAt = (fromToday: boolean) => {
      let best = 0, run = 0; const start = new Date(); start.setFullYear(start.getFullYear() - 1);
      const cursor = new Date(start);
      let current = 0;
      const todayK = key(new Date());
      while (cursor <= new Date()) {
        if (doneSet.has(key(cursor))) { run += 1; best = Math.max(best, run); } else run = 0;
        cursor.setDate(cursor.getDate() + 1);
      }
      // current streak counting back from today
      const c = new Date();
      while (doneSet.has(key(c))) { current += 1; c.setDate(c.getDate() - 1); }
      if (!doneSet.has(todayK)) { /* allow streak ending yesterday */ }
      return fromToday ? current : best;
    };
    // best month by avg completion
    const monthAgg: Record<string, { sum: number; n: number }> = {};
    dates.forEach(k => { const mk = k.slice(0, 7); const e = monthAgg[mk] ?? { sum: 0, n: 0 }; e.sum += dayRatio(routine, completions[k]); e.n += 1; monthAgg[mk] = e; });
    let bestMonth: { label: string; pct: number } | null = null;
    Object.entries(monthAgg).forEach(([mk, v]) => { const pct = (v.sum / v.n) * 100; if (!bestMonth || pct > bestMonth.pct) bestMonth = { label: `${MONTHS_LONG[+mk.slice(5) - 1]}`, pct }; });
    return {
      tracked: dates.length,
      completed: completed.length,
      completedPct: dates.length ? Math.round((completed.length / dates.length) * 100) : 0,
      current: streakAt(true),
      longest: streakAt(false),
      bestMonth: bestMonth as { label: string; pct: number } | null,
    };
  }, [completions, routine]);

  const CELL = 15, GAP = 3;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px', fontFamily: BODY }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: '0.9rem', color: C.text }}>Actividad de rutina</div>
        <div style={{ display: 'flex', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: 3, gap: 3 }}>
          {([['year', 'Este año'], ['month', 'Este mes'], ['30d', 'Últimos 30 días']] as [View, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '6px 12px', borderRadius: 7, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: BODY, background: view === v ? 'rgba(79,143,255,0.14)' : 'transparent', color: view === v ? C.blue : C.muted }}>{l}</button>
          ))}
        </div>
      </div>

      {/* grid */}
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'inline-block', minWidth: 'min-content' }}>
          {/* month labels */}
          <div style={{ display: 'flex', marginLeft: 26, height: 16 }}>
            {columns.map((_, ci) => {
              const lbl = monthLabels.find(m => m.col === ci);
              return <div key={ci} style={{ width: CELL, marginRight: GAP, fontSize: 10, color: C.muted, fontFamily: BODY, position: 'relative' }}>{lbl && <span style={{ position: 'absolute', left: 0, whiteSpace: 'nowrap' }}>{lbl.text}</span>}</div>;
            })}
          </div>
          <div style={{ display: 'flex' }}>
            {/* day-of-week labels */}
            <div style={{ display: 'flex', flexDirection: 'column', marginRight: 8, gap: GAP }}>
              {DOW.map((d, i) => <div key={d} style={{ height: CELL, fontSize: 9, color: C.muted, display: 'flex', alignItems: 'center', width: 18 }}>{i % 2 === 0 ? d[0] : ''}</div>)}
            </div>
            {/* columns */}
            <div style={{ display: 'flex', gap: GAP }}>
              {columns.map((week, ci) => (
                <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                  {week.map((day, ri) => {
                    if (!day.inRange) return <div key={ri} style={{ width: CELL, height: CELL }} />;
                    return (
                      <div
                        key={ri}
                        onMouseEnter={e => setHover({ info: day, x: e.clientX, y: e.clientY })}
                        onMouseMove={e => setHover(h => h ? { ...h, x: e.clientX, y: e.clientY } : h)}
                        onMouseLeave={() => setHover(null)}
                        onClick={() => !day.future && navigate(`/journal?date=${day.date}`)}
                        style={{ width: CELL, height: CELL, borderRadius: 3, background: cellColor(day.ratio, !day.future), border: day.date === key(new Date()) ? `1px solid ${C.blue}` : '1px solid transparent', cursor: day.future ? 'default' : 'pointer', opacity: day.future ? 0.4 : 1, transition: 'transform 0.1s' }}
                        onMouseOver={e => { if (!day.future) e.currentTarget.style.transform = 'scale(1.18)'; }}
                        onMouseOut={e => (e.currentTarget.style.transform = 'none')}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 10, color: C.muted }}>
        <span>Menos</span>
        {[0, 0.25, 0.5, 0.8, 1].map(r => <span key={r} style={{ width: 12, height: 12, borderRadius: 3, background: cellColor(r, r > 0) }} />)}
        <span>Más</span>
      </div>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 18, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
        <Stat label="Días registrados" value={String(stats.tracked)} />
        <Stat label="Rutina completa" value={`${stats.completed} · ${stats.completedPct}%`} />
        <Stat label="Racha actual" value={`${stats.current} d`} accent />
        <Stat label="Mejor racha" value={`${stats.longest} d`} />
        {stats.bestMonth && <Stat label="Mejor mes" value={`${stats.bestMonth.label} · ${Math.round(stats.bestMonth.pct)}%`} />}
      </div>

      {/* tooltip */}
      {hover && (
        <div style={{ position: 'fixed', left: Math.min(hover.x + 14, window.innerWidth - 220), top: hover.y - 10, zIndex: 100, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: '0.72rem', pointerEvents: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.5)', minWidth: 160 }}>
          <div style={{ fontFamily: HEAD, fontWeight: 700, color: C.text, marginBottom: 4 }}>{tooltipDate(hover.info.date)}</div>
          <div style={{ color: C.text2 }}>{hover.info.total ? `${hover.info.done}/${hover.info.total} hábitos` : 'Sin rutina'}</div>
          {hover.info.trades > 0 && <div style={{ color: C.text2 }}>{hover.info.trades} {hover.info.trades === 1 ? 'operación' : 'operaciones'}</div>}
          {hover.info.trades > 0 && <div style={{ color: hover.info.pnl >= 0 ? C.blue : C.red }}>{hover.info.pnl >= 0 ? '+' : '-'}${Math.abs(Math.round(hover.info.pnl)).toLocaleString('en-US')}</div>}
        </div>
      )}
    </div>
  );
}

function tooltipDate(k: string) {
  const d = new Date(`${k}T00:00:00`);
  return `${DOW_LONG[mondayIndex(d)]} ${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: '1.15rem', color: accent ? C.blue : C.text, marginTop: 3 }}>{value}</div>
    </div>
  );
}

export default ProgressHeatmap;

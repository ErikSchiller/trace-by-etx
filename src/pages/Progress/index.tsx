import { useEffect, useMemo, useState } from 'react';
import { useUserTrades, getWinRate, getCumulativePnL, type Trade } from '../../store/tradeStore';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { ProLock } from '../../components/UI/ProLock';
import { Watermark } from '../../components/UI/Watermark';
import { useToast } from '../../components/UI/ToastProvider';

const fontHead = "'Syne', sans-serif";
const card: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '16px 18px', position: 'relative',
};
const label: React.CSSProperties = {
  fontSize: '0.62rem', color: '#4a4a60', letterSpacing: '0.08em',
  textTransform: 'uppercase', fontWeight: 600, marginBottom: 8,
};

const CHECKLIST_ITEMS = [
  'Revisé mi plan del día antes de operar',
  'Esperé a la sesión correcta',
  'Solo operé mis setups confirmados',
  'Respeté mi stop loss',
  'Revisé mis operaciones al final del día',
];

interface Goal {
  id: string;
  type: 'pnl' | 'winrate' | 'maxops' | 'streak';
  label: string;
  target: number;
}

const GOAL_TYPES: { type: Goal['type']; label: string; unit: string }[] = [
  { type: 'pnl',     label: 'Net PnL mensual objetivo', unit: '€' },
  { type: 'winrate', label: 'Win rate objetivo',        unit: '%' },
  { type: 'maxops',  label: 'Operaciones máx. por día', unit: 'ops' },
  { type: 'streak',  label: 'Días seguidos con plan',   unit: 'días' },
];

function todayKey() { return new Date().toISOString().slice(0, 10); }

function loadChecklist(userId: string): Record<string, boolean[]> {
  try { return JSON.parse(localStorage.getItem(`trace_checklist_${userId}`) || '{}'); }
  catch { return {}; }
}
function saveChecklist(userId: string, data: Record<string, boolean[]>) {
  localStorage.setItem(`trace_checklist_${userId}`, JSON.stringify(data));
}
function loadGoals(userId: string): Goal[] {
  try { return JSON.parse(localStorage.getItem(`trace_goals_${userId}`) || '[]'); }
  catch { return []; }
}
function saveGoals(userId: string, goals: Goal[]) {
  localStorage.setItem(`trace_goals_${userId}`, JSON.stringify(goals));
}

function computeStreaks(data: Record<string, boolean[]>) {
  const completedDays = Object.entries(data)
    .filter(([, items]) => items.filter(Boolean).length === 5)
    .map(([d]) => d)
    .sort();
  const total = completedDays.length;
  if (total === 0) return { current: 0, best: 0, total: 0 };
  // current streak: walk back from today
  let current = 0;
  const d = new Date();
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (completedDays.includes(key)) { current += 1; d.setDate(d.getDate() - 1); }
    else if (key === todayKey()) { d.setDate(d.getDate() - 1); } // today not yet done doesn't break
    else break;
  }
  // best streak
  let best = 1, run = 1;
  for (let i = 1; i < completedDays.length; i++) {
    const prev = new Date(`${completedDays[i - 1]}T00:00:00`);
    const cur = new Date(`${completedDays[i]}T00:00:00`);
    if ((cur.getTime() - prev.getTime()) / 86400000 === 1) { run += 1; best = Math.max(best, run); }
    else run = 1;
  }
  return { current, best: Math.max(best, current), total };
}

export default function Progress() {
  const userId = useAuthStore(s => s.user?.id) ?? 'anon';
  const trades = useUserTrades();
  const { push } = useToast();

  const [checklist, setChecklist] = useState<Record<string, boolean[]>>(() => loadChecklist(userId));
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals(userId));
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => { saveChecklist(userId, checklist); }, [checklist, userId]);
  useEffect(() => { saveGoals(userId, goals); }, [goals, userId]);

  const today = todayKey();
  const todayItems = checklist[today] ?? CHECKLIST_ITEMS.map(() => false);
  const todayDone = todayItems.filter(Boolean).length;
  const streaks = useMemo(() => computeStreaks(checklist), [checklist]);

  const toggle = (i: number) => {
    setChecklist(c => {
      const items = [...(c[today] ?? CHECKLIST_ITEMS.map(() => false))];
      items[i] = !items[i];
      const next = { ...c, [today]: items };
      if (items.filter(Boolean).length === 5) {
        push({ kind: 'success', text: '¡Día perfecto! 🎉' });
      }
      return next;
    });
  };

  const insights = useMemo(() => buildInsights(trades, streaks.current), [trades, streaks.current]);

  const todayLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── DAILY CHECKLIST (free) ── */}
      <div style={{ ...card, borderColor: 'rgba(79,143,255,0.15)' }}>
        <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
          Tu rutina diaria — {todayLabel}
        </div>
        <div style={{ fontSize: 12, color: '#4a4a60', marginBottom: 14 }}>Marca lo que has hecho hoy</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CHECKLIST_ITEMS.map((item, i) => {
            const done = todayItems[i];
            return (
              <button
                key={i} onClick={() => toggle(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: done ? 'rgba(79,143,255,0.05)' : 'transparent',
                  border: '1px solid', borderColor: done ? 'rgba(79,143,255,0.2)' : 'var(--border)',
                  borderRadius: 8, padding: '10px 14px', cursor: 'pointer',
                  textAlign: 'left', fontFamily: "'Space Grotesk', sans-serif",
                  transition: 'all 0.15s',
                }}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  border: done ? 'none' : '1px solid #33334a',
                  background: done ? 'var(--blue)' : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 11,
                }}>{done ? '✓' : ''}</span>
                <span style={{
                  fontSize: '0.85rem',
                  color: done ? '#4a4a60' : '#e0e0e8',
                  textDecoration: done ? 'line-through' : 'none',
                }}>{item}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <div style={{ flex: 1, height: 6, background: '#1a1a1c', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${(todayDone / 5) * 100}%`, height: '100%', background: 'var(--blue)', transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 12, color: '#888898' }}>{todayDone}/5 completos</span>
          {todayDone === 5 && (
            <span style={{ background: 'rgba(79,143,255,0.1)', color: 'var(--blue)', fontSize: 11, padding: '3px 10px', borderRadius: 10, fontWeight: 600 }}>
              ¡Día perfecto! Racha: {streaks.current} días
            </span>
          )}
        </div>
      </div>

      <ProLock feature="Progress Tracker completo" description="Rachas, heatmap anual, objetivos e insights">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ── STREAKS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={card}>
              <div style={label}>Racha actual</div>
              <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2.5rem', color: 'var(--blue)', lineHeight: 1 }}>{streaks.current}</div>
              <div style={{ fontSize: 12, color: '#4a4a60', marginTop: 6 }}>días consecutivos siguiendo tu checklist</div>
              <Watermark />
            </div>
            <div style={card}>
              <div style={label}>Mejor racha</div>
              <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2.5rem', color: '#fff', lineHeight: 1 }}>{streaks.best}</div>
              <div style={{ fontSize: 12, color: '#4a4a60', marginTop: 6 }}>tu récord personal</div>
            </div>
            <div style={card}>
              <div style={label}>Días totales completados</div>
              <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2.5rem', color: '#fff', lineHeight: 1 }}>{streaks.total}</div>
              <div style={{ fontSize: 12, color: '#4a4a60', marginTop: 6 }}>desde que empezaste</div>
            </div>
          </div>

          {/* ── YEAR HEATMAP ── */}
          <div style={{ ...card, overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={label}>Heatmap del año</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[year - 1, year].map(y => (
                  <button key={y} onClick={() => setYear(y)} style={{
                    background: y === year ? 'rgba(79,143,255,0.1)' : 'transparent',
                    color: y === year ? 'var(--blue)' : '#4a4a60',
                    border: '1px solid', borderColor: y === year ? 'rgba(79,143,255,0.25)' : 'var(--border)',
                    borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600,
                  }}>{y}</button>
                ))}
              </div>
            </div>
            <YearHeatmap year={year} checklist={checklist} />
            <Watermark />
          </div>

          {/* ── GOALS ── */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={label}>Objetivos</div>
              <button onClick={() => setShowGoalForm(s => !s)} style={{
                background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 6,
                padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>＋ Añadir objetivo</button>
            </div>
            {showGoalForm && (
              <GoalForm onAdd={g => { setGoals(gs => [...gs, g]); setShowGoalForm(false); push({ kind: 'success', text: 'Objetivo creado' }); }} />
            )}
            {goals.length === 0 && !showGoalForm ? (
              <div style={{ fontSize: 12, color: '#33334a', padding: '12px 0' }}>
                Define tu primer objetivo para hacer seguimiento de tu progreso.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                {goals.map(g => (
                  <GoalRow key={g.id} goal={g} trades={trades} streak={streaks.current}
                    onDelete={() => { setGoals(gs => gs.filter(x => x.id !== g.id)); push({ kind: 'success', text: 'Objetivo eliminado' }); }} />
                ))}
              </div>
            )}
          </div>

          {/* ── INSIGHTS ── */}
          {insights.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={label}>Insights de comportamiento</div>
              {insights.map((ins, i) => (
                <div key={i} style={{ ...card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18 }}>{ins.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>{ins.title}</div>
                    <div style={{ fontSize: 12, color: '#888898', marginTop: 2 }}>{ins.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ProLock>
    </div>
  );
}

function YearHeatmap({ year, checklist }: { year: number; checklist: Record<string, boolean[]> }) {
  const start = new Date(year, 0, 1);
  const cells: { date: string; count: number }[] = [];
  const d = new Date(start);
  while (d.getFullYear() === year) {
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, count: (checklist[key] ?? []).filter(Boolean).length });
    d.setDate(d.getDate() + 1);
  }
  const colorFor = (n: number) =>
    n === 0 ? '#1a1a1c'
    : n <= 2 ? 'rgba(79,143,255,0.2)'
    : n <= 4 ? 'rgba(79,143,255,0.5)'
    : 'rgba(79,143,255,0.9)';
  // group by week
  const weeks: { date: string; count: number }[][] = [];
  let week: { date: string; count: number }[] = [];
  for (const c of cells) {
    const day = new Date(`${c.date}T00:00:00`).getDay();
    if (day === 0 && week.length) { weeks.push(week); week = []; }
    week.push(c);
  }
  if (week.length) weeks.push(week);

  return (
    <div style={{ display: 'flex', gap: 2, minWidth: 750 }}>
      {weeks.map((w, wi) => (
        <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.from({ length: 7 }, (_, di) => {
            const cell = w.find(c => new Date(`${c.date}T00:00:00`).getDay() === di);
            return (
              <div key={di} title={cell ? `${cell.date}: ${cell.count}/5` : ''} style={{
                width: 11, height: 11, borderRadius: 2,
                background: cell ? colorFor(cell.count) : 'transparent',
              }} />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function GoalForm({ onAdd }: { onAdd: (g: Goal) => void }) {
  const [type, setType] = useState<Goal['type']>('pnl');
  const [target, setTarget] = useState('');
  const meta = GOAL_TYPES.find(g => g.type === type)!;
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
      <select value={type} onChange={e => setType(e.target.value as Goal['type'])} style={{ flex: 1, minWidth: 180 }}>
        {GOAL_TYPES.map(g => <option key={g.type} value={g.type}>{g.label}</option>)}
      </select>
      <input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder={`Objetivo (${meta.unit})`} style={{ width: 140 }} />
      <button
        onClick={() => {
          const t = parseFloat(target);
          if (!isFinite(t) || t <= 0) return;
          onAdd({ id: String(Date.now()), type, label: meta.label, target: t });
          setTarget('');
        }}
        style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
      >Crear</button>
    </div>
  );
}

function GoalRow({ goal, trades, streak, onDelete }: { goal: Goal; trades: Trade[]; streak: number; onDelete: () => void }) {
  const beCountsAsWin = useSettingsStore(s => s.beCountsAsWin);
  const current = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthTrades = trades.filter(t => t.date.startsWith(monthKey));
    switch (goal.type) {
      case 'pnl':     return getCumulativePnL(monthTrades);
      case 'winrate': return getWinRate(trades, beCountsAsWin);
      case 'maxops': {
        const byDay: Record<string, number> = {};
        monthTrades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + 1; });
        return Math.max(0, ...Object.values(byDay));
      }
      case 'streak':  return streak;
    }
  }, [goal, trades, streak, beCountsAsWin]);

  // for maxops, lower is better (inverted)
  const inverted = goal.type === 'maxops';
  const pct = inverted
    ? Math.max(0, Math.min(100, 100 - ((current - goal.target) / goal.target) * 100))
    : Math.max(0, Math.min(100, (current / goal.target) * 100));
  const status = pct >= 100 ? 'Conseguido' : pct >= 75 ? 'Cerca' : pct >= 40 ? 'En camino' : 'Lejos';
  const statusColor = pct >= 100 ? 'var(--blue)' : pct >= 75 ? '#f59e0b' : '#888898';

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: '0.82rem', color: '#fff' }}>{goal.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: statusColor, fontWeight: 600 }}>{status}</span>
          <button onClick={onDelete} style={{ background: 'transparent', border: 'none', color: '#33334a', cursor: 'pointer', fontSize: 13 }}>×</button>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 5, background: '#1a1a1c', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--blue)', transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: 11, color: '#888898', whiteSpace: 'nowrap' }}>
          {Math.round(current)} / {goal.target}
        </span>
      </div>
    </div>
  );
}

function buildInsights(trades: Trade[], streak: number) {
  const out: { icon: string; title: string; desc: string }[] = [];
  if (trades.length === 0) return out;

  // Best setup
  const bySetup = new Map<string, Trade[]>();
  for (const t of trades) {
    const k = t.setup || 'Sin setup';
    if (!bySetup.has(k)) bySetup.set(k, []);
    bySetup.get(k)!.push(t);
  }
  let bestSetup: { name: string; wr: number; n: number } | null = null;
  for (const [name, list] of bySetup) {
    if (list.length < 3) continue;
    const wr = (list.filter(t => t.pnl > 0).length / list.length) * 100;
    if (!bestSetup || wr > bestSetup.wr) bestSetup = { name, wr, n: list.length };
  }
  if (bestSetup && bestSetup.wr >= 60) {
    out.push({ icon: '🎯', title: `Tu mejor setup es ${bestSetup.name}`, desc: `${bestSetup.wr.toFixed(0)}% win rate en ${bestSetup.n} trades` });
  }

  // FOMO this week
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const fomoTrades = trades.filter(t => t.errorTags.includes('FOMO') && new Date(`${t.date}T00:00:00`) >= weekAgo);
  if (fomoTrades.length >= 2) {
    const pnl = fomoTrades.reduce((s, t) => s + t.pnl, 0);
    out.push({ icon: '⚠️', title: `${fomoTrades.length} trades con FOMO esta semana`, desc: `Net ${pnl >= 0 ? '+' : '-'}€${Math.abs(Math.round(pnl))} — vigila tus impulsos` });
  }

  // Losing days streak
  const byDay: Record<string, number> = {};
  trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl; });
  const days = Object.keys(byDay).sort().reverse();
  let lossDays = 0;
  for (const d of days) { if (byDay[d] < 0) lossDays += 1; else break; }
  if (lossDays >= 3) {
    out.push({ icon: '📉', title: `${lossDays} días seguidos de pérdidas`, desc: 'Considera tomar un día de descanso y revisar tu plan' });
  }

  // Streak
  if (streak >= 3) {
    out.push({ icon: '✅', title: `Llevas ${streak} días siguiendo tu plan`, desc: 'Sigue así — la consistencia es lo que separa a los rentables' });
  }
  return out;
}

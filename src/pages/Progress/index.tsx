import { useEffect, useMemo, useState } from 'react';
import { useFilteredTrades, getWinRate, getCumulativePnL, type Trade } from '../../store/tradeStore';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useRoutineStore, TEMPLATES, SUGGESTED_HABITS, type Template, type Habit } from '../../store/routineStore';
import { ProLock } from '../../components/UI/ProLock';
import { Button } from '../../components/UI/Button';
import { AnimatedNumber } from '../../components/UI/AnimatedNumber';
import { useToast } from '../../components/UI/ToastProvider';
import { useUserNotes } from '../../store/notebookStore';
import { celebrateRoutineComplete, celebrateStreakMilestone } from '../../utils/milestones';
import { computeStreaks, detectStreakEvents, STREAK_META, type StreakInfo, type StreakKey } from '../../utils/streaks';
import { ProgressHeatmap } from '../../components/Progress/ProgressHeatmap';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '16px 18px', position: 'relative' };
const label: React.CSSProperties = { fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 };

interface Goal { id: string; type: 'pnl' | 'winrate' | 'maxops' | 'streak'; label: string; target: number }
const GOAL_TYPES: { type: Goal['type']; label: string; unit: string }[] = [
  { type: 'pnl', label: 'Net PnL mensual objetivo', unit: '€' },
  { type: 'winrate', label: 'Win rate objetivo', unit: '%' },
  { type: 'maxops', label: 'Operaciones máx. por día', unit: 'ops' },
  { type: 'streak', label: 'Días seguidos con rutina', unit: 'días' },
];

function todayKey() { return new Date().toISOString().slice(0, 10); }
function loadGoals(u: string): Goal[] { try { return JSON.parse(localStorage.getItem(`trace_goals_${u}`) || '[]'); } catch { return []; } }
function saveGoals(u: string, g: Goal[]) { localStorage.setItem(`trace_goals_${u}`, JSON.stringify(g)); }

export default function Progress() {
  const userId = useAuthStore(s => s.user?.id) ?? 'anon';
  const trades = useFilteredTrades();
  const { push } = useToast();
  const routine = useRoutineStore(s => s.routine);
  const completions = useRoutineStore(s => s.completions);
  const setRoutine = useRoutineStore(s => s.setRoutine);
  const toggleHabit = useRoutineStore(s => s.toggleHabit);

  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals(userId));
  const [showGoalForm, setShowGoalForm] = useState(false);
  useEffect(() => { saveGoals(userId, goals); }, [goals, userId]);

  const notes = useUserNotes();
  const dailyLossLimit = useSettingsStore(s => s.dailyLossLimit);
  const notifyStreak = useSettingsStore(s => s.notifyStreak);
  const allStreaks = useMemo(
    () => computeStreaks({ routine, completions, trades, notes, dailyLossLimit }),
    [routine, completions, trades, notes, dailyLossLimit]
  );
  const streaks = allStreaks.routine;
  const insights = useMemo(() => buildInsights(trades, streaks.current), [trades, streaks.current]);

  // Fire toasts / celebrations when a streak reaches a milestone, sets a record, or breaks.
  useEffect(() => {
    const events = detectStreakEvents(allStreaks);
    if (events.length === 0) return;
    const nameOf = (k: StreakKey) => STREAK_META.find(m => m.key === k)?.name ?? '';
    for (const ev of events) {
      if (notifyStreak) {
        push({ kind: ev.kind === 'broken' ? 'info' : 'success', title: ev.message, description: nameOf(ev.key) });
      }
      if (ev.kind !== 'broken') celebrateStreakMilestone(ev.key, allStreaks[ev.key].current);
    }
  }, [allStreaks, notifyStreak, push]);

  const applyTemplate = (t: Template) => { setRoutine(t.title, t.habits); setTemplatesOpen(false); push({ kind: 'success', text: 'Rutina creada' }); };
  const applyCustom = (name: string, habits: string[]) => { setRoutine(name, habits); setCustomOpen(false); push({ kind: 'success', text: 'Rutina creada' }); };

  // ── EMPTY STATE ──
  if (!routine) {
    return (
      <div style={{ padding: '48px 24px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: 720, width: '100%', textAlign: 'center' }}>
          <h1 style={{ ...syne(800), fontSize: '1.6rem', color: 'var(--text-primary)', margin: '0 0 12px' }}>Construye la rutina que te hará mejor trader</h1>
          <p style={{ fontFamily: fontBody, fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.6 }}>
            El Progress Tracker te ayuda a construir hábitos consistentes. Marca cada día lo que has hecho — el chart te muestra tu racha y patrones.
          </p>
          <div className="prog-paths" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <PathCard emoji="📋" title="Plantillas" desc="Rutinas ya diseñadas para day traders, swing traders y prop firm traders." cta="Ver plantillas →" onClick={() => setTemplatesOpen(true)} />
            <PathCard emoji="✏️" title="Personalizada" desc="Diseña tu propia rutina desde cero con los hábitos que tú elijas." cta="Crear rutina →" onClick={() => setCustomOpen(true)} />
          </div>
        </div>
        <TemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} onUse={applyTemplate} />
        <CustomRoutineModal open={customOpen} onClose={() => setCustomOpen(false)} onCreate={applyCustom} />
        <style>{`@media (max-width:700px){ .prog-paths{ grid-template-columns:1fr !important; } }`}</style>
      </div>
    );
  }

  // ── MAIN VIEW ──
  const today = todayKey();
  const doneToday = completions[today] ?? [];
  const habitIds = new Set(routine.habits.map(h => h.id));
  const doneCount = doneToday.filter(id => habitIds.has(id)).length;
  const allDone = doneCount === routine.habits.length && routine.habits.length > 0;

  const handleToggleHabit = (habitId: string) => {
    toggleHabit(today, habitId);
    const done = useRoutineStore.getState().completions[today] ?? [];
    const count = done.filter(id => habitIds.has(id)).length;
    if (count === routine.habits.length && routine.habits.length > 0) celebrateRoutineComplete(today);
  };

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Today's checklist hero */}
      <div style={{ ...card, background: 'linear-gradient(135deg, rgba(79,143,255,0.06), var(--card) 60%)', borderColor: 'rgba(79,143,255,0.15)', padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ ...syne(700), fontSize: '1rem', color: 'var(--text-primary)' }}>Rutina de hoy — {routine.name}</div>
          <button onClick={() => setEditOpen(true)} style={{ background: 'transparent', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, fontFamily: fontBody }}>Editar rutina</button>
        </div>
        <div style={{ height: 3, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ width: `${(doneCount / routine.habits.length) * 100}%`, height: '100%', background: 'var(--blue)', transition: 'width 0.3s' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: routine.habits.length > 5 ? '1fr 1fr' : '1fr', gap: 8 }}>
          {routine.habits.map(h => {
            const checked = doneToday.includes(h.id);
            return (
              <button key={h.id} onClick={() => handleToggleHabit(h.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none',
                padding: '8px 6px', cursor: 'pointer', textAlign: 'left', fontFamily: fontBody,
              }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 5, flexShrink: 0,
                  border: checked ? 'none' : '1px solid #2a2a35', background: checked ? 'var(--blue)' : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13,
                }}>{checked ? '✓' : ''}</span>
                <span style={{ fontSize: '0.88rem', color: checked ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: checked ? 'line-through' : 'none' }}>{h.text}</span>
              </button>
            );
          })}
        </div>
        {allDone && (
          <div style={{ marginTop: 14, textAlign: 'center', color: 'var(--blue)', fontFamily: fontHead, fontWeight: 700, fontSize: '0.9rem' }}>
            ¡Día perfecto! 🎉 Racha: {streaks.current} días
          </div>
        )}
      </div>

      <ProLock feature="Progress Tracker completo" description="Rachas, heatmap anual, objetivos e insights">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Streak cards */}
          <div className="prog-streaks" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12 }}>
            {STREAK_META.map(m => <StreakCard key={m.key} icon={m.icon} name={m.name} info={allStreaks[m.key]} />)}
          </div>

          {/* Routine activity heatmap */}
          <ProgressHeatmap />

          {/* Goals */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ ...syne(700), fontSize: '0.85rem', color: 'var(--text-primary)' }}>Objetivos personales</div>
              <Button size="sm" variant="primary" onClick={() => setShowGoalForm(s => !s)}>＋ Añadir objetivo</Button>
            </div>
            {showGoalForm && <GoalForm onAdd={g => { setGoals(gs => [...gs, g]); setShowGoalForm(false); push({ kind: 'success', text: 'Objetivo creado' }); }} />}
            {goals.length === 0 && !showGoalForm ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0' }}>Define tu primer objetivo para hacer seguimiento de tu progreso.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                {goals.map(g => <GoalRow key={g.id} goal={g} trades={trades} streak={streaks.current} onDelete={() => { setGoals(gs => gs.filter(x => x.id !== g.id)); push({ kind: 'success', text: 'Objetivo eliminado' }); }} />)}
              </div>
            )}
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={label}>Insights de comportamiento</div>
              {insights.map((ins, i) => (
                <div key={i} style={{ ...card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18 }}>{ins.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{ins.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{ins.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ProLock>

      <EditRoutineModal open={editOpen} onClose={() => setEditOpen(false)} routineName={routine.name} habits={routine.habits} />
      <style>{`@media (max-width:700px){ .prog-streaks{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

function syne(w: number): React.CSSProperties { return { fontFamily: fontHead, fontWeight: w }; }

function PathCard({ emoji, title, desc, cta, onClick }: { emoji: string; title: string; desc: string; cta: string; onClick: () => void }) {
  return (
    <div style={{ ...card, padding: '28px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize: 34 }}>{emoji}</div>
      <div style={{ ...syne(700), fontSize: '1.05rem', color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontFamily: fontBody, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>{desc}</div>
      <Button variant="primary" onClick={onClick}>{cta}</Button>
    </div>
  );
}

function StreakCard({ icon, name, info }: { icon: string; name: string; info: StreakInfo }) {
  const { current, best, last7 } = info;
  const trophy = current > 30;
  const glow = current > 14;
  const flame = current > 7;
  return (
    <div style={{
      ...card, padding: '18px 20px',
      borderColor: glow ? 'rgba(79,143,255,0.45)' : 'var(--border-subtle)',
      boxShadow: current > 30 ? '0 0 24px rgba(79,143,255,0.25)' : glow ? '0 0 14px rgba(79,143,255,0.15)' : 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span style={{ fontSize: 15 }}>{icon}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
        </div>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>Récord: {best}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
        <span style={{ ...syne(800), fontSize: '2rem', color: current > 0 ? 'var(--blue)' : 'var(--text-primary)', lineHeight: 1 }}>
          <AnimatedNumber value={current} />
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>días</span>
        {flame && <span style={{ fontSize: 16, marginLeft: 2 }}>🔥</span>}
        {trophy && <span style={{ fontSize: 16 }}>🏆</span>}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
        {last7.map((on, i) => (
          <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: on ? 'var(--blue)' : 'var(--border)', flexShrink: 0 }} />
        ))}
      </div>
    </div>
  );
}

/* ── Templates modal ── */
function ModalShell({ open, onClose, title, maxWidth = 560, children }: { open: boolean; onClose: () => void; title: string; maxWidth?: number; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '50px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth, fontFamily: fontBody, color: 'var(--text)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ background: 'var(--card-2)', borderBottom: '1px solid var(--border-subtle)', padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ ...syne(800), fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '18px 22px' }}>{children}</div>
      </div>
    </div>
  );
}

function TemplatesModal({ open, onClose, onUse }: { open: boolean; onClose: () => void; onUse: (t: Template) => void }) {
  return (
    <ModalShell open={open} onClose={onClose} title="Plantillas de rutina">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {TEMPLATES.map(t => (
          <div key={t.id} style={{ background: 'var(--card-2)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '18px 20px', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ ...syne(700), fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}><span>{t.emoji}</span>{t.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{t.description}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>
                  {t.habits.slice(0, 3).map((h, i) => <div key={i}>☐ {h}</div>)}
                  {t.habits.length > 3 && <div style={{ color: 'var(--blue)' }}>+ {t.habits.length - 3} más</div>}
                </div>
              </div>
              <Button size="sm" variant="primary" onClick={() => onUse(t)}>Usar →</Button>
            </div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

function CustomRoutineModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string, habits: string[]) => void }) {
  const [name, setName] = useState('Mi rutina');
  const [habits, setHabits] = useState<string[]>(['']);
  const setHabit = (i: number, v: string) => setHabits(h => h.map((x, j) => j === i ? v : x));
  const addHabit = (text = '') => setHabits(h => h.length >= 15 ? h : [...h, text]);
  const removeHabit = (i: number) => setHabits(h => h.filter((_, j) => j !== i));
  const create = () => {
    const clean = habits.map(h => h.trim()).filter(Boolean);
    if (!clean.length) return;
    onCreate(name.trim() || 'Mi rutina', clean);
  };
  const inp: React.CSSProperties = { fontFamily: fontBody, background: 'var(--card-2)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
  return (
    <ModalShell open={open} onClose={onClose} title="Crea tu rutina">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={label}>Nombre</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Mi rutina de mañana" style={inp} />
        </div>
        <div>
          <label style={label}>Hábitos</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {habits.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: 5, border: '1px solid #2a2a35', flexShrink: 0 }} />
                <input value={h} onChange={e => setHabit(i, e.target.value)} placeholder={`Hábito ${i + 1}`} style={inp} />
                {habits.length > 1 && <button onClick={() => removeHabit(i)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15 }}>✕</button>}
              </div>
            ))}
          </div>
          {habits.length < 15 && <button onClick={() => addHabit()} style={{ marginTop: 8, background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-tertiary)', borderRadius: 7, padding: '7px 12px', fontSize: '0.76rem', cursor: 'pointer', fontFamily: fontBody }}>＋ Añadir hábito</button>}
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>¿Necesitas inspiración?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTED_HABITS.map(s => (
              <button key={s} onClick={() => addHabit(s)} style={{ fontFamily: fontBody, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 14, padding: '4px 11px', fontSize: '0.72rem', cursor: 'pointer' }}>{s}</button>
            ))}
          </div>
        </div>
        <Button variant="primary" fullWidth onClick={create}>Crear rutina</Button>
      </div>
    </ModalShell>
  );
}

function EditRoutineModal({ open, onClose, routineName, habits }: { open: boolean; onClose: () => void; routineName: string; habits: Habit[] }) {
  const updateRoutine = useRoutineStore(s => s.updateRoutine);
  const clearRoutine = useRoutineStore(s => s.clearRoutine);
  const { push } = useToast();
  const [name, setName] = useState(routineName);
  const [items, setItems] = useState<Habit[]>(habits);
  useEffect(() => { if (open) { setName(routineName); setItems(habits); } }, [open, routineName, habits]);
  const inp: React.CSSProperties = { fontFamily: fontBody, background: 'var(--card-2)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const save = () => {
    const clean = items.map(h => ({ ...h, text: h.text.trim() })).filter(h => h.text);
    if (!clean.length) return;
    updateRoutine(name.trim() || 'Mi rutina', clean);
    onClose(); push({ kind: 'success', text: 'Rutina actualizada' });
  };
  return (
    <ModalShell open={open} onClose={onClose} title="Editar rutina">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={label}>Nombre</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={label}>Hábitos</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((h, i) => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input value={h.text} onChange={e => setItems(it => it.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} style={inp} />
                {items.length > 1 && <button onClick={() => setItems(it => it.filter((_, j) => j !== i))} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15 }}>✕</button>}
              </div>
            ))}
          </div>
          {items.length < 15 && <button onClick={() => setItems(it => [...it, { id: Math.random().toString(36).slice(2), text: '' }])} style={{ marginTop: 8, background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-tertiary)', borderRadius: 7, padding: '7px 12px', fontSize: '0.76rem', cursor: 'pointer', fontFamily: fontBody }}>＋ Añadir hábito</button>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => { clearRoutine(); onClose(); push({ kind: 'success', text: 'Rutina eliminada' }); }} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.78rem', fontFamily: fontBody }}>Eliminar rutina</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={save}>Guardar</Button>
          </div>
        </div>
      </div>
    </ModalShell>
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
      <Button size="sm" variant="primary" onClick={() => { const t = parseFloat(target); if (!isFinite(t) || t <= 0) return; onAdd({ id: String(Date.now()), type, label: meta.label, target: t }); setTarget(''); }}>Crear</Button>
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
      case 'pnl': return getCumulativePnL(monthTrades);
      case 'winrate': return getWinRate(trades, beCountsAsWin);
      case 'maxops': { const byDay: Record<string, number> = {}; monthTrades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + 1; }); return Math.max(0, ...Object.values(byDay)); }
      case 'streak': return streak;
    }
  }, [goal, trades, streak, beCountsAsWin]);
  const inverted = goal.type === 'maxops';
  const pct = inverted ? Math.max(0, Math.min(100, 100 - ((current - goal.target) / goal.target) * 100)) : Math.max(0, Math.min(100, (current / goal.target) * 100));
  const status = pct >= 100 ? 'Conseguido' : pct >= 75 ? 'Cerca' : pct >= 40 ? 'En camino' : 'Lejos';
  const statusColor = pct >= 100 ? 'var(--blue)' : pct >= 75 ? 'var(--warning)' : 'var(--text-secondary)';
  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{goal.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: statusColor, fontWeight: 600 }}>{status}</span>
          <button onClick={onDelete} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>×</button>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 5, background: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--blue)', transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{Math.round(current)} / {goal.target}</span>
      </div>
    </div>
  );
}

function buildInsights(trades: Trade[], streak: number) {
  const out: { icon: string; title: string; desc: string }[] = [];
  if (trades.length === 0) return out;
  const bySetup = new Map<string, Trade[]>();
  for (const t of trades) { const k = t.setup || 'Sin setup'; if (!bySetup.has(k)) bySetup.set(k, []); bySetup.get(k)!.push(t); }
  let bestSetup: { name: string; wr: number; n: number } | null = null;
  for (const [name, list] of bySetup) { if (list.length < 3) continue; const wr = (list.filter(t => t.pnl > 0).length / list.length) * 100; if (!bestSetup || wr > bestSetup.wr) bestSetup = { name, wr, n: list.length }; }
  if (bestSetup && bestSetup.wr >= 60) out.push({ icon: '🎯', title: `Tu mejor setup es ${bestSetup.name}`, desc: `${bestSetup.wr.toFixed(0)}% win rate en ${bestSetup.n} trades` });
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const fomo = trades.filter(t => t.errorTags.includes('FOMO') && new Date(`${t.date}T00:00:00`) >= weekAgo);
  if (fomo.length >= 2) { const pnl = fomo.reduce((s, t) => s + t.pnl, 0); out.push({ icon: '⚠️', title: `${fomo.length} trades con FOMO esta semana`, desc: `Net ${pnl >= 0 ? '+' : '-'}€${Math.abs(Math.round(pnl))} — vigila tus impulsos` }); }
  if (streak >= 3) out.push({ icon: '✅', title: `Llevas ${streak} días siguiendo tu rutina`, desc: 'Sigue así — la consistencia es lo que separa a los rentables' });
  return out;
}

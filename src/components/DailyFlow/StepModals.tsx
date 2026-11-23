import { useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import { X, Plus, Check, ClipboardCheck } from 'lucide-react';
import {
  useDailyFlowStore, type ChecklistItem, type DisciplineTask, type Grade, type Mood, type TradeRecapEntry,
} from '../../store/dailyFlowStore';
import type { Trade } from '../../store/tradeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { celebrate } from '../../utils/celebrate';
import { playSound } from '../../utils/sounds';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const C = {
  card: '#111113', field: '#1a1d26', border: '#1e2029', borderEl: '#22252e',
  blue: '#4f8fff', red: '#ef4444', text: '#f7f8fa', text2: '#d0d0dc', muted: '#6b7382', faint: '#4a4a60',
};

type Tone = 'blue' | 'blueLight' | 'neutral' | 'redLight' | 'red';
const TONES: Record<Tone, { fg: string; bg: string; bd: string }> = {
  blue:      { fg: '#4f8fff', bg: 'rgba(79,143,255,0.08)', bd: 'rgba(79,143,255,0.4)' },
  blueLight: { fg: '#8bb3ff', bg: 'rgba(79,143,255,0.06)', bd: 'rgba(79,143,255,0.3)' },
  neutral:   { fg: '#f7f8fa', bg: 'rgba(255,255,255,0.06)', bd: 'rgba(255,255,255,0.16)' },
  redLight:  { fg: '#f98a8a', bg: 'rgba(239,68,68,0.06)', bd: 'rgba(239,68,68,0.3)' },
  red:       { fg: '#ef4444', bg: 'rgba(239,68,68,0.08)', bd: 'rgba(239,68,68,0.4)' },
};
// Same word ↔ 1–5 mapping as AddTradeModal.
const MOODS: { v: Mood; label: string; tone: Tone }[] = [
  { v: 5, label: 'Excelente', tone: 'blue' }, { v: 4, label: 'Bueno', tone: 'blueLight' }, { v: 3, label: 'Neutral', tone: 'neutral' },
  { v: 2, label: 'Malo', tone: 'redLight' }, { v: 1, label: 'Muy malo', tone: 'red' },
];
const ENERGY: { v: Mood; label: string; tone: Tone }[] = [
  { v: 1, label: 'Agotado', tone: 'red' }, { v: 2, label: 'Bajo', tone: 'redLight' }, { v: 3, label: 'Normal', tone: 'neutral' },
  { v: 4, label: 'Alto', tone: 'blueLight' }, { v: 5, label: 'Pleno', tone: 'blue' },
];
const GRADES: { g: Grade; tone: Tone }[] = [
  { g: 'A', tone: 'blue' }, { g: 'B', tone: 'blueLight' }, { g: 'C', tone: 'neutral' }, { g: 'D', tone: 'redLight' }, { g: 'F', tone: 'red' },
];

/* ── shared UI ─────────────────────────────────────────────────────────── */
function Shell({ title, onClose, children, footer, width = 560 }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode; width?: number }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, width: '100%', maxWidth: width, maxHeight: '88vh', display: 'flex', flexDirection: 'column', fontFamily: fontBody, color: C.text, boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <h2 style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1.15rem', margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', display: 'inline-flex' }}><X size={18} /></button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '16px 24px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>{footer}</div>
      </div>
    </div>
  );
}
const Label = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0 0 10px' }}>
    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{children}</span>
    {right}
  </div>
);
function Chip({ active, tone, onClick, children }: { active: boolean; tone: Tone; onClick: () => void; children: React.ReactNode }) {
  const t = TONES[tone];
  return <button type="button" onClick={onClick} style={{ padding: '8px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', fontFamily: fontBody, background: active ? t.bg : C.field, border: `1px solid ${active ? t.bd : C.borderEl}`, color: active ? t.fg : '#a1a9ba' }}>{children}</button>;
}
const Box = ({ checked, onClick }: { checked: boolean; onClick: () => void }) => (
  <button type="button" onClick={onClick} aria-pressed={checked} style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 6, border: `1px solid ${checked ? C.blue : C.borderEl}`, background: checked ? C.blue : 'transparent', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{checked && <Check size={13} />}</button>
);
const primary = (enabled = true): React.CSSProperties => ({ background: C.blue, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: '0.86rem', fontWeight: 600, cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.5, fontFamily: fontBody });
const ghost: React.CSSProperties = { background: 'transparent', color: C.text2, border: `1px solid ${C.borderEl}`, borderRadius: 9, padding: '10px 18px', fontSize: '0.86rem', cursor: 'pointer', fontFamily: fontBody };
const linkBtn: React.CSSProperties = { background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '0.78rem', fontFamily: fontBody, padding: 0 };
const textarea: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: C.field, border: `1px solid ${C.borderEl}`, borderRadius: 10, padding: '12px 14px', fontSize: '0.88rem', color: C.text, lineHeight: 1.55, outline: 'none', resize: 'vertical', fontFamily: fontBody };

function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (label: string) => void }) {
  const [v, setV] = useState('');
  const commit = () => { if (v.trim()) { onAdd(v.trim()); setV(''); } };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <Plus size={16} color={C.muted} style={{ flexShrink: 0 }} />
      <input value={v} onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commit(); }} onBlur={commit} placeholder={placeholder}
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: C.text2, fontSize: '0.86rem', fontFamily: fontBody }} />
    </div>
  );
}

/* ── 1. Pre-market ─────────────────────────────────────────────────────── */
export function PreMarketModal({ date, onClose, onContinue }: { date: string; onClose: () => void; onContinue: () => void }) {
  const existing = useDailyFlowStore(s => s.days[date]?.preMarket);
  const template = useDailyFlowStore(s => s.defaultChecklist);
  const save = useDailyFlowStore(s => s.savePreMarket);
  const skip = useDailyFlowStore(s => s.skipPreMarket);
  const updateTemplate = useDailyFlowStore(s => s.updateDefaultChecklist);
  const prior = existing && !existing.skipped ? existing : undefined;
  const [mood, setMood] = useState<Mood | null>(prior?.mood ?? null);
  const [items, setItems] = useState<ChecklistItem[]>(() => prior?.checklist ?? template.map(t => ({ ...t, checked: false })));
  const [notes, setNotes] = useState(prior?.notes ?? '');
  const [templateSaved, setTemplateSaved] = useState(false);

  const submit = () => {
    if (!mood) return;
    save(date, { mood, moodLabel: MOODS.find(m => m.v === mood)!.label, checklist: items, notes: notes.trim() || undefined, completedAt: new Date().toISOString() });
    onContinue();
  };

  return (
    <Shell title="Pre-market Setup" onClose={onClose} footer={<>
      <button onClick={() => { skip(date); onClose(); }} style={linkBtn}>Saltar hoy</button>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={ghost}>Cancelar</button>
        <button onClick={submit} disabled={!mood} title={!mood ? 'Elige cómo te sientes' : undefined} style={primary(!!mood)}>Guardar y continuar</button>
      </div>
    </>}>
      <Label>¿Cómo te sientes hoy?</Label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {MOODS.map(m => <Chip key={m.v} active={mood === m.v} tone={m.tone} onClick={() => setMood(m.v)}>{m.label}</Chip>)}
      </div>

      <Label right={<button onClick={() => { updateTemplate(items.map(({ id, label }) => ({ id, label }))); setTemplateSaved(true); }} style={{ ...linkBtn, color: templateSaved ? C.blue : C.muted }}>{templateSaved ? '✓ Plantilla guardada' : 'Guardar como plantilla'}</button>}>
        Checklist pre-mercado
      </Label>
      {items.map(it => (
        <div key={it.id} className="df-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
          <Box checked={it.checked} onClick={() => setItems(xs => xs.map(x => x.id === it.id ? { ...x, checked: !x.checked } : x))} />
          <input value={it.label} onChange={e => setItems(xs => xs.map(x => x.id === it.id ? { ...x, label: e.target.value } : x))}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: it.checked ? C.muted : C.text2, fontSize: '0.88rem', fontFamily: fontBody, textDecoration: it.checked ? 'line-through' : 'none' }} />
          <button className="df-item-x" onClick={() => setItems(xs => xs.filter(x => x.id !== it.id))} aria-label="Quitar" style={{ background: 'transparent', border: 'none', color: C.faint, cursor: 'pointer', display: 'inline-flex' }}><X size={14} /></button>
        </div>
      ))}
      <AddRow placeholder="Añadir item…" onAdd={label => setItems(xs => [...xs, { id: nanoid(), label, checked: false }])} />

      <div style={{ marginTop: 18 }}>
        <Label>Notas (opcional)</Label>
        <textarea value={notes} onChange={e => setNotes(e.target.value.slice(0, 200))} rows={3} placeholder="Sesgo del día, niveles, lo que vigilas…" style={textarea} />
        <div style={{ textAlign: 'right', fontSize: '0.66rem', color: C.faint, marginTop: 4 }}>{notes.length}/200</div>
      </div>
    </Shell>
  );
}

/* ── 2. Discipline ─────────────────────────────────────────────────────── */
export function DisciplineModal({ date, onClose }: { date: string; onClose: () => void }) {
  const existing = useDailyFlowStore(s => s.days[date]?.discipline);
  const template = useDailyFlowStore(s => s.defaultDisciplineTasks);
  const save = useDailyFlowStore(s => s.saveDiscipline);
  const updateTemplate = useDailyFlowStore(s => s.updateDefaultDisciplineTasks);
  const [tasks, setTasks] = useState<DisciplineTask[]>(() => existing?.tasks ?? template.map(t => ({ ...t, done: false })));
  const [asTemplate, setAsTemplate] = useState(false);

  // Every change persists immediately; the step only completes on "Finalizar día".
  const update = (next: DisciplineTask[]) => { setTasks(next); save(date, next, false); };
  const persistTemplate = () => { if (asTemplate) updateTemplate(tasks.map(({ id, label }) => ({ id, label }))); };
  const close = () => { persistTemplate(); onClose(); };
  const finalize = () => { persistTemplate(); save(date, tasks, true); onClose(); };
  const doneCount = tasks.filter(t => t.done).length;

  return (
    <Shell title="Tus reglas para hoy" onClose={close} footer={<>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: C.muted, cursor: 'pointer' }}>
        <Box checked={asTemplate} onClick={() => setAsTemplate(v => !v)} /> Reutilizar como plantilla
      </label>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={close} style={ghost}>Cerrar</button>
        <button onClick={finalize} disabled={tasks.length === 0} style={primary(tasks.length > 0)}>Finalizar día</button>
      </div>
    </>}>
      <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: 14 }}>{doneCount}/{tasks.length} cumplidas · marca cada regla al cumplirla</div>
      {tasks.map(t => (
        <div key={t.id} className="df-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
          <Box checked={t.done} onClick={() => update(tasks.map(x => x.id === t.id ? { ...x, done: !x.done, doneAt: !x.done ? new Date().toISOString() : undefined } : x))} />
          <span style={{ flex: 1, fontSize: '0.9rem', color: t.done ? C.muted : C.text2, textDecoration: t.done ? 'line-through' : 'none' }}>{t.label}</span>
          <button className="df-item-x" onClick={() => update(tasks.filter(x => x.id !== t.id))} aria-label="Quitar" style={{ background: 'transparent', border: 'none', color: C.faint, cursor: 'pointer', display: 'inline-flex' }}><X size={14} /></button>
        </div>
      ))}
      <AddRow placeholder="Añadir tarea…" onAdd={label => update([...tasks, { id: nanoid(), label, done: false }])} />
    </Shell>
  );
}

/* ── 3. Trade recap ────────────────────────────────────────────────────── */
export function TradeRecapModal({ date, trades, onClose }: { date: string; trades: Trade[]; onClose: () => void }) {
  const storedEntries = useDailyFlowStore(s => s.days[date]?.tradeRecap?.entries);
  const stored = storedEntries ?? [];
  const gradeTrade = useDailyFlowStore(s => s.gradeTrade);
  const complete = useDailyFlowStore(s => s.completeTradeRecap);
  const sym = useSettingsStore(s => s.currencySymbol);
  const [drafts, setDrafts] = useState<Record<string, Partial<TradeRecapEntry>>>(() =>
    Object.fromEntries(trades.map(t => { const e = stored.find(x => x.tradeId === t.id); return [t.id, e ?? { tradeId: t.id, rulesFollowed: true }]; })));

  // Persist only once a grade exists (an entry without a grade isn't a grading).
  const edit = (id: string, patch: Partial<TradeRecapEntry>) => {
    const next = { ...drafts[id], ...patch, tradeId: id };
    setDrafts(d => ({ ...d, [id]: next }));
    if (next.grade) gradeTrade(date, { tradeId: id, grade: next.grade, rulesFollowed: next.rulesFollowed ?? true, notes: next.notes?.trim() || undefined, gradedAt: new Date().toISOString() });
  };
  const graded = trades.filter(t => drafts[t.id]?.grade).length;
  const canFinish = trades.length === 0 || graded === trades.length;
  const fmt = (n: number) => `${n >= 0 ? '+' : '-'}${sym}${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

  return (
    <Shell title="Califica tus trades de hoy" width={trades.length > 1 ? 820 : 560} onClose={onClose} footer={<>
      <span style={{ fontSize: '0.8rem', color: C.muted }}>{trades.length ? `${graded} / ${trades.length} calificados` : ''}</span>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={ghost}>Cerrar</button>
        {trades.length > 0 && <button onClick={() => { complete(date); onClose(); }} disabled={!canFinish} title={!canFinish ? 'Califica todas las operaciones' : undefined} style={primary(canFinish)}>Finalizar recap</button>}
      </div>
    </>}>
      {trades.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 10px' }}>
          <ClipboardCheck size={32} color={C.faint} style={{ margin: '0 auto 12px' }} />
          <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>Aún no has registrado operaciones hoy</div>
          <div style={{ fontSize: '0.84rem', color: C.muted, marginBottom: 20 }}>Registra tus trades para calificarlos, o cierra el paso si hoy no operaste.</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('trace:open-add-trade')); }} style={primary()}>Añadir operación</button>
            <button onClick={() => { complete(date); onClose(); }} style={ghost}>Marcar día sin trades</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: trades.length > 1 ? 'repeat(auto-fill,minmax(340px,1fr))' : '1fr', gap: 12 }}>
          {trades.map(t => {
            const d = drafts[t.id] ?? {};
            const tone = d.grade ? TONES[GRADES.find(g => g.g === d.grade)!.tone] : null;
            return (
              <div key={t.id} style={{ position: 'relative', background: '#15171d', border: `1px solid ${tone ? tone.bd : C.border}`, borderRadius: 10, padding: 16 }}>
                {d.grade && <span style={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderRadius: '50%', background: tone!.fg, color: '#0d0d0f', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Check size={12} /></span>}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12, paddingRight: 26 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.asset}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: t.direction === 'long' ? C.blue : C.red }}>{t.direction.toUpperCase()}</span>
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: t.pnl >= 0 ? C.blue : C.red }}>{fmt(t.pnl)}</span>
                  <span style={{ fontSize: '0.74rem', color: C.muted, marginLeft: 'auto' }}>{t.time}</span>
                </div>
                <div style={{ fontSize: '0.66rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Ejecución</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {GRADES.map(g => <Chip key={g.g} active={d.grade === g.g} tone={g.tone} onClick={() => edit(t.id, { grade: g.g })}>{g.g}</Chip>)}
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: C.text2, cursor: 'pointer', marginBottom: 10 }}>
                  <Box checked={d.rulesFollowed ?? true} onClick={() => edit(t.id, { rulesFollowed: !(d.rulesFollowed ?? true) })} /> Seguí mis reglas
                </label>
                <textarea value={d.notes ?? ''} onChange={e => edit(t.id, { notes: e.target.value.slice(0, 300) })} rows={2} placeholder="Nota (opcional)" style={{ ...textarea, fontSize: '0.8rem', padding: '8px 10px' }} />
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

/* ── 4. Day wrap ───────────────────────────────────────────────────────── */
export function DayWrapModal({ date, onClose }: { date: string; onClose: () => void }) {
  const existing = useDailyFlowStore(s => s.days[date]?.dayWrap);
  const saveWrap = useDailyFlowStore(s => s.saveDayWrap);
  const [reflection, setReflection] = useState(existing?.reflection ?? '');
  const [focus, setFocus] = useState(existing?.tomorrowFocus ?? '');
  const [energy, setEnergy] = useState<Mood | null>(existing?.energyLevel ?? null);
  const ok = reflection.trim().length >= 20 && !!energy;

  const sign = () => {
    if (!ok) return;
    saveWrap(date, { reflection: reflection.trim(), tomorrowFocus: focus.trim() || undefined, energyLevel: energy!, signedAt: new Date().toISOString() });
    if (useDailyFlowStore.getState().isDayFullyComplete(date)) { celebrate('huge'); playSound('success'); }
    onClose();
  };

  return (
    <Shell title="Cierre del día" onClose={onClose} footer={<>
      <span style={{ fontSize: '0.74rem', color: C.muted }}>{reflection.trim().length < 20 ? `Mínimo 20 caracteres (${reflection.trim().length}/20)` : !energy ? 'Indica tu energía' : ''}</span>
      <button onClick={sign} disabled={!ok} style={{ ...primary(ok), padding: '11px 24px' }}>Firmar y cerrar día</button>
    </>}>
      <Label>¿Cómo ha ido el día?</Label>
      <textarea value={reflection} onChange={e => setReflection(e.target.value)} rows={5} placeholder="Qué salió bien, qué no, qué aprendiste…" style={{ ...textarea, marginBottom: 20 }} />
      <Label>¿Qué vas a hacer distinto mañana? (opcional)</Label>
      <textarea value={focus} onChange={e => setFocus(e.target.value)} rows={2} placeholder="Una cosa concreta" style={{ ...textarea, marginBottom: 20 }} />
      <Label>¿Cómo está tu energía?</Label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ENERGY.map(e => <Chip key={e.v} active={energy === e.v} tone={e.tone} onClick={() => setEnergy(e.v)}>{e.label}</Chip>)}
      </div>
    </Shell>
  );
}

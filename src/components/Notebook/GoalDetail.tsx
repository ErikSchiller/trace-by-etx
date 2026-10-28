import { useState } from 'react';
import { Plus, Target, Check, ChevronLeft, Trash2, FileText, Image as ImageIcon } from 'lucide-react';
import { useGoalsStore, goalProgress, GOAL_CATEGORY_COLOR, type Goal, type GoalCategory } from '../../store/goalsStore';
import type { Note } from '../../store/notebookStore';
import { EditableText } from '../../pages/Notebook/NotebookBlocks';
import { CoverBar, CoverImagePicker } from './CoverImagePicker';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const C = {
  bg: '#0a0a0c', card: '#15171d', card2: '#131418', border: '#1e2029', borderEl: '#2a2c33',
  blue: '#4f8fff', green: '#22c55e', text: '#f7f8fa', text2: '#d0d0dc', muted: '#6b7280', faint: '#4a4a60',
};
const CAT_LABEL: Record<GoalCategory, string> = { trading: 'Trading', financial: 'Financiero', health: 'Salud', personal: 'Personal', other: 'Otro' };
const CATS: GoalCategory[] = ['trading', 'financial', 'health', 'personal', 'other'];

export function GoalDetail({ goalId, notes, onOpenNote, onBack }: {
  goalId: string;
  notes: Note[];
  onOpenNote: (id: string) => void;
  onBack: () => void;
}) {
  const goal = useGoalsStore(s => s.goals.find(g => g.id === goalId));
  const updateGoal = useGoalsStore(s => s.updateGoal);
  const toggleMilestone = useGoalsStore(s => s.toggleMilestone);
  const addMilestone = useGoalsStore(s => s.addMilestone);
  const deleteMilestone = useGoalsStore(s => s.deleteMilestone);
  const toggleAction = useGoalsStore(s => s.toggleAction);
  const addAction = useGoalsStore(s => s.addAction);
  const deleteAction = useGoalsStore(s => s.deleteAction);
  const setCurrent = useGoalsStore(s => s.setCurrent);
  const [mText, setMText] = useState('');
  const [aText, setAText] = useState('');
  const [coverOpen, setCoverOpen] = useState(false);

  if (!goal) return <div style={{ padding: 60, textAlign: 'center', color: C.muted, fontFamily: fontBody }}>Meta no encontrada</div>;

  const pct = Math.round(goalProgress(goal) * 100);
  const accent = goal.color ?? GOAL_CATEGORY_COLOR[goal.category];
  const cover = goal.cover ?? { type: 'gradient' as const, color: `linear-gradient(135deg,${accent}22,${accent})` };
  const linked = notes.filter(n => goal.linkedNoteIds?.includes(n.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', fontFamily: fontBody }}>
      {/* top bar */}
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 48px' }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '0.8rem', fontFamily: fontBody }}><ChevronLeft size={16} /> Notebook / Objetivos</button>
        <button onClick={() => setCoverOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, borderRadius: 8, padding: '6px 12px', fontSize: '0.78rem', cursor: 'pointer', fontFamily: fontBody }}><ImageIcon size={13} /> Portada</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <CoverBar cover={cover} height={180} onReposition={p => updateGoal(goal.id, { cover: { ...cover, position: p } })} onChange={() => setCoverOpen(true)} onRemove={() => updateGoal(goal.id, { cover: undefined })} />

        <div className="nb-editor-grid" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 48px 56px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 40, alignItems: 'start' }}>
          {/* LEFT */}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: `${accent}22`, color: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Target size={18} /></span>
              <EditableText value={goal.title} onChange={t => updateGoal(goal.id, { title: t })} placeholder="Objetivo sin título"
                style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.9rem', color: C.text, letterSpacing: '-0.01em', flex: 1 }} />
            </div>

            {/* category chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0 22px' }}>
              {CATS.map(c => (
                <button key={c} onClick={() => updateGoal(goal.id, { category: c, color: GOAL_CATEGORY_COLOR[c] })} style={{ background: goal.category === c ? `${GOAL_CATEGORY_COLOR[c]}1a` : 'transparent', border: `1px solid ${goal.category === c ? GOAL_CATEGORY_COLOR[c] : C.border}`, color: goal.category === c ? GOAL_CATEGORY_COLOR[c] : C.muted, borderRadius: 14, padding: '4px 12px', fontSize: '0.74rem', fontWeight: 500, cursor: 'pointer', fontFamily: fontBody }}>{CAT_LABEL[c]}</button>
              ))}
            </div>

            {/* overall progress */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px', marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: '0.8rem', color: C.text2, fontWeight: 600 }}>Progreso</span>
                <span style={{ fontSize: '0.9rem', color: accent, fontWeight: 700 }}>{pct}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 5, background: '#22252e', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: accent, transition: 'width 0.3s' }} /></div>
              {goal.type === 'metric' && goal.target != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  <input type="number" value={goal.current ?? 0} onChange={e => setCurrent(goal.id, parseFloat(e.target.value) || 0)} style={{ width: 90, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 10px', color: C.text, fontSize: '0.82rem', outline: 'none', fontFamily: fontBody }} />
                  <span style={{ color: C.muted, fontSize: '0.82rem' }}>/ {goal.target.toLocaleString()} {goal.unit}</span>
                </div>
              )}
            </div>

            {/* Objetivos principales (milestones) */}
            <Section title="Objetivos principales">
              {(goal.milestones ?? []).map(m => (
                <CheckRow key={m.id} checked={m.completed} label={m.label} accent={accent} onToggle={() => toggleMilestone(goal.id, m.id)} onDelete={() => deleteMilestone(goal.id, m.id)} />
              ))}
              <AddRow value={mText} setValue={setMText} placeholder="Añadir objetivo…" onAdd={() => { if (mText.trim()) { addMilestone(goal.id, mText.trim()); setMText(''); } }} />
            </Section>

            {/* Acciones */}
            <Section title="Acciones">
              {(goal.actions ?? []).map(a => (
                <CheckRow key={a.id} checked={a.completed} label={a.label} accent={C.blue} onToggle={() => toggleAction(goal.id, a.id)} onDelete={() => deleteAction(goal.id, a.id)} />
              ))}
              <AddRow value={aText} setValue={setAText} placeholder="Añadir acción…" onAdd={() => { if (aText.trim()) { addAction(goal.id, aText.trim()); setAText(''); } }} />
            </Section>
          </div>

          {/* RIGHT — timeline + linked notes */}
          <div className="nb-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.84rem', color: C.text, marginBottom: 12 }}>Timeline</div>
              {[...(goal.milestones ?? []), ...(goal.actions ?? [])].length === 0 && <div style={{ fontSize: '0.74rem', color: C.faint }}>Añade objetivos o acciones</div>}
              {[...(goal.milestones ?? []), ...(goal.actions ?? [])].map((m, i, arr) => (
                <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: m.completed ? C.green : 'transparent', border: `2px solid ${m.completed ? C.green : C.borderEl}`, flexShrink: 0, marginTop: 3 }} />
                    {i < arr.length - 1 && <span style={{ width: 2, flex: 1, background: C.border, margin: '2px 0' }} />}
                  </div>
                  <span style={{ fontSize: '0.76rem', color: m.completed ? C.muted : C.text2, textDecoration: m.completed ? 'line-through' : 'none', paddingBottom: 10 }}>{m.label || '—'}</span>
                </div>
              ))}
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.84rem', color: C.text, marginBottom: 10 }}>Notas vinculadas</div>
              {linked.length === 0 && <div style={{ fontSize: '0.74rem', color: C.faint }}>Sin notas vinculadas</div>}
              {linked.map(n => (
                <button key={n.id} onClick={() => onOpenNote(n.id)} style={{ width: '100%', textAlign: 'left', display: 'flex', gap: 8, alignItems: 'center', background: 'transparent', border: 'none', padding: '7px 0', color: C.text2, cursor: 'pointer', fontSize: '0.78rem', fontFamily: fontBody }}>
                  <FileText size={13} color={C.muted} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title || 'Sin título'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {coverOpen && (
        <CoverImagePicker recent={[]} onPick={c => { updateGoal(goal.id, { cover: c }); setCoverOpen(false); }} onClose={() => setCoverOpen(false)} />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1rem', color: C.text, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function CheckRow({ checked, label, accent, onToggle, onDelete }: { checked: boolean; label: string; accent: string; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className="nb-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      <button onClick={onToggle} style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 6, border: `1px solid ${checked ? accent : C.borderEl}`, background: checked ? accent : 'transparent', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{checked && <Check size={13} />}</button>
      <span style={{ flex: 1, fontSize: '0.9rem', color: checked ? C.muted : C.text2, textDecoration: checked ? 'line-through' : 'none' }}>{label}</span>
      <button className="nb-row-more" onClick={onDelete} title="Eliminar" style={{ background: 'transparent', border: 'none', color: C.faint, cursor: 'pointer', opacity: 0, display: 'inline-flex', transition: 'opacity 0.12s' }}><Trash2 size={13} /></button>
    </div>
  );
}

function AddRow({ value, setValue, placeholder, onAdd }: { value: string; setValue: (v: string) => void; placeholder: string; onAdd: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
      <Plus size={15} color={C.muted} style={{ flexShrink: 0 }} />
      <input value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onAdd(); }} placeholder={placeholder}
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: C.text2, fontSize: '0.86rem', fontFamily: fontBody }} />
    </div>
  );
}

export function GoalBlockView({ goal, onOpen }: { goal?: Goal; onOpen: () => void }) {
  if (!goal) return <div style={{ margin: '16px 0', padding: '14px 18px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, fontSize: '0.84rem', fontFamily: fontBody }}>Meta no encontrada</div>;
  const pct = Math.round(goalProgress(goal) * 100);
  const accent = goal.color ?? GOAL_CATEGORY_COLOR[goal.category];
  return (
    <button onClick={onOpen} style={{ width: '100%', textAlign: 'left', display: 'block', margin: '16px 0', padding: '16px 18px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', fontFamily: fontBody }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = C.borderEl)} onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ width: 26, height: 26, borderRadius: 7, background: `${accent}22`, color: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Target size={14} /></span>
        <span style={{ flex: 1, fontSize: '0.92rem', fontWeight: 600, color: C.text }}>{goal.title}</span>
        <span style={{ fontSize: '0.82rem', color: accent, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: '#22252e', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: accent }} /></div>
    </button>
  );
}

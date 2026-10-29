import { useMemo, useRef, useState } from 'react';
import { Plus, X, Paperclip, Target, FileText, ChevronDown, Calendar as CalIcon } from 'lucide-react';
import type { Note, Folder, Attachment, NoteStatus, PropertyValue, PropertyValueType } from '../../store/notebookStore';
import { useUserGoals, useGoalsStore, goalProgress, type Goal } from '../../store/goalsStore';
import { processImageForUpload } from '../../utils/imageProcessing';

const fontBody = "'Space Grotesk', sans-serif";
const fontHead = "'Syne', sans-serif";
const C = {
  card: '#15171d', border: '#1e2029', rowBorder: '#1a1d26', borderEl: '#22252e', bg: '#0d0d0f',
  blue: '#4f8fff', green: '#22c55e', text: '#f7f8fa', text2: '#d0d0dc', muted: '#6b7382', faint: '#4a4a60',
};

const STATUS_LABEL: Record<NoteStatus, string> = { borrador: 'Borrador', en_progreso: 'En progreso', completado: 'Completado', archivado: 'Archivado' };
const STATUS_COLOR: Record<NoteStatus, string> = { borrador: '#6b7382', en_progreso: '#4f8fff', completado: '#4f8fff', archivado: '#4a4a60' };
const PROP_TYPES: { v: PropertyValueType; label: string }[] = [
  { v: 'text', label: 'Texto' }, { v: 'number', label: 'Número' }, { v: 'date', label: 'Fecha' },
  { v: 'checkbox', label: 'Checkbox' }, { v: 'url', label: 'URL' }, { v: 'multi_select', label: 'Multi-select' },
];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MAX_FILE = 2 * 1024 * 1024;
function fmtDate(iso?: string) { if (!iso) return '—'; const d = new Date(iso + 'T00:00:00'); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; }

interface Props {
  note: Note;
  folders: Folder[];
  onUpdate: (patch: Partial<Note>) => void;
  onMove: (folderId: string) => void;
  onOpenAttachment: (att: Attachment) => void;
  onToast: (kind: 'success' | 'error', text: string) => void;
}

export function NoteSidebar({ note, folders, onUpdate, onMove, onOpenAttachment, onToast }: Props) {
  const goals = useUserGoals();
  const addGoal = useGoalsStore(s => s.addGoal);
  const linkNoteToGoal = useGoalsStore(s => s.linkNote);
  const unlinkNoteFromGoal = useGoalsStore(s => s.unlinkNote);

  const props = note.properties ?? {};
  const linkedIds = note.linkedGoalIds ?? [];
  const linkedGoals = goals.filter(g => linkedIds.includes(g.id));
  const unlinkedGoals = goals.filter(g => !linkedIds.includes(g.id));
  const attachments = note.attachments ?? [];

  const [tagInput, setTagInput] = useState('');
  const [addPropOpen, setAddPropOpen] = useState(false);
  const [propName, setPropName] = useState('');
  const [propType, setPropType] = useState<PropertyValueType>('text');
  const [goalPickerOpen, setGoalPickerOpen] = useState(false);
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const setProps = (patch: Partial<Note['properties']>) => onUpdate({ properties: { ...props, ...patch } });
  const currentFolder = folders.find(f => f.id === note.folderId);

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/,$/, '');
    if (tag && !note.tags.includes(tag)) onUpdate({ tags: [...note.tags, tag] });
    setTagInput('');
  };

  const addCustomField = () => {
    const name = propName.trim();
    if (!name) return;
    const value: PropertyValue = { type: propType, value: propType === 'checkbox' ? false : '' };
    setProps({ customFields: { ...(props.customFields ?? {}), [name]: value } });
    setPropName(''); setAddPropOpen(false);
  };
  const setCustomValue = (name: string, value: unknown) => {
    const cf = { ...(props.customFields ?? {}) }; cf[name] = { ...cf[name], value }; setProps({ customFields: cf });
  };
  const removeCustomField = (name: string) => { const cf = { ...(props.customFields ?? {}) }; delete cf[name]; setProps({ customFields: cf }); };

  const linkGoal = (goalId: string) => { onUpdate({ linkedGoalIds: Array.from(new Set([...linkedIds, goalId])) }); linkNoteToGoal(goalId, note.id); setGoalPickerOpen(false); };
  const unlinkGoal = (goalId: string) => { onUpdate({ linkedGoalIds: linkedIds.filter(id => id !== goalId) }); unlinkNoteFromGoal(goalId, note.id); };
  const createAndLink = () => {
    const title = newGoalTitle.trim(); if (!title) return;
    const g = addGoal({ title, category: 'personal', type: 'milestone', linkedNoteIds: [note.id] });
    onUpdate({ linkedGoalIds: [...linkedIds, g.id] }); setNewGoalTitle(''); setCreatingGoal(false);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      try {
        if (file.type.startsWith('image/')) {
          const dataUrl = await processImageForUpload(file);
          onUpdate({ attachments: [...(note.attachments ?? []), { id: crypto.randomUUID(), type: 'image', url: dataUrl, name: file.name, size: file.size, thumbnail: dataUrl }] });
        } else if (file.size <= MAX_FILE) {
          const dataUrl: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
          onUpdate({ attachments: [...(note.attachments ?? []), { id: crypto.randomUUID(), type: 'file', url: dataUrl, name: file.name, size: file.size }] });
        } else onToast('error', `${file.name} supera 2MB — demasiado grande para adjuntar`);
      } catch { onToast('error', 'No se pudo adjuntar el archivo'); }
    }
  };
  const removeAttachment = (id: string) => onUpdate({ attachments: attachments.filter(a => a.id !== id) });

  const customFieldEntries = Object.entries(props.customFields ?? {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: fontBody }}>
      {/* ── Propiedades ── */}
      <Card title="Propiedades">
        <PropRow label="Colección">
          <Dropdown
            value={<span style={{ color: C.text }}>{currentFolder?.name ?? '—'}</span>}
            options={folders.map(f => ({ key: f.id, label: f.name }))}
            onSelect={id => onMove(id)}
          />
        </PropRow>
        <PropRow label="Fecha">
          <DatePopover value={(props.date ?? note.date ?? '').slice(0, 10)} onChange={d => setProps({ date: d })} />
        </PropRow>
        <PropRow label="Estado">
          <Dropdown
            value={props.status
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: STATUS_COLOR[props.status] }}><Dot color={STATUS_COLOR[props.status]} filled={props.status === 'completado'} />{STATUS_LABEL[props.status]}</span>
              : <span style={{ color: C.muted }}>—</span>}
            options={[{ key: '', label: '—' }, ...(Object.keys(STATUS_LABEL) as NoteStatus[]).map(s => ({ key: s, label: STATUS_LABEL[s], color: STATUS_COLOR[s], filled: s === 'completado' }))]}
            onSelect={v => setProps({ status: (v || undefined) as NoteStatus })}
          />
        </PropRow>
        <PropRow label="Etiquetas" top last={customFieldEntries.length === 0}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'flex-end' }}>
            {note.tags.map(t => (
              <span key={t} style={tagChip}>{t}<X size={10} style={{ cursor: 'pointer' }} onClick={() => onUpdate({ tags: note.tags.filter(x => x !== t) })} /></span>
            ))}
            <input value={tagInput} onChange={e => { const v = e.target.value; if (v.endsWith(',')) addTag(v); else setTagInput(v); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
              placeholder="+ etiqueta" style={{ background: 'transparent', border: 'none', outline: 'none', color: C.text2, fontSize: '0.72rem', fontFamily: fontBody, width: 60, textAlign: 'right' }} />
          </div>
        </PropRow>

        {customFieldEntries.map(([name, pv], i) => (
          <PropRow key={name} label={name} onRemove={() => removeCustomField(name)} last={i === customFieldEntries.length - 1}>
            {pv.type === 'checkbox' ? (
              <input type="checkbox" checked={!!pv.value} onChange={e => setCustomValue(name, e.target.checked)} style={{ accentColor: C.blue }} />
            ) : pv.type === 'date' ? (
              <DatePopover value={String(pv.value ?? '')} onChange={d => setCustomValue(name, d)} />
            ) : (
              <input type={pv.type === 'number' ? 'number' : pv.type === 'url' ? 'url' : 'text'}
                value={String(pv.value ?? '')} onChange={e => setCustomValue(name, e.target.value)} placeholder="—"
                style={{ background: 'transparent', border: 'none', outline: 'none', color: C.text, fontSize: '0.78rem', fontFamily: fontBody, textAlign: 'right', width: '100%' }} />
            )}
          </PropRow>
        ))}

        {addPropOpen ? (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input autoFocus value={propName} onChange={e => setPropName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCustomField(); if (e.key === 'Escape') setAddPropOpen(false); }} placeholder="Nombre" style={{ flex: 1, minWidth: 0, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 8px', fontSize: '0.74rem', color: C.text, outline: 'none', fontFamily: fontBody }} />
            <select value={propType} onChange={e => setPropType(e.target.value as PropertyValueType)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px', fontSize: '0.72rem', color: C.text2, outline: 'none', fontFamily: fontBody }}>
              {PROP_TYPES.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
            </select>
            <button onClick={addCustomField} style={miniBtn}>OK</button>
          </div>
        ) : (
          <button onClick={() => setAddPropOpen(true)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '0.76rem', fontFamily: fontBody, padding: '10px 0 2px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text2)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
            <Plus size={13} /> Añadir propiedad
          </button>
        )}
      </Card>

      {/* ── Metas relacionadas ── */}
      <Card title="Metas relacionadas" icon={<Target size={14} color={C.muted} />}>
        {linkedGoals.length === 0 && <div style={{ fontSize: '0.75rem', color: C.muted, textAlign: 'center', padding: '16px 0' }}>Sin metas vinculadas</div>}
        {linkedGoals.map(g => <GoalRow key={g.id} goal={g} onUnlink={() => unlinkGoal(g.id)} />)}
        {goalPickerOpen && (
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, marginTop: 6, maxHeight: 160, overflowY: 'auto' }}>
            {unlinkedGoals.length === 0 && <div style={{ fontSize: '0.74rem', color: C.muted, padding: 10 }}>No hay más metas</div>}
            {unlinkedGoals.map(g => (
              <button key={g.id} onClick={() => linkGoal(g.id)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '8px 10px', fontSize: '0.76rem', color: C.text2, cursor: 'pointer', fontFamily: fontBody, display: 'flex', gap: 8, alignItems: 'center' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color ?? C.blue, flexShrink: 0 }} />{g.title}
              </button>
            ))}
          </div>
        )}
        {creatingGoal ? (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input autoFocus value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createAndLink(); if (e.key === 'Escape') setCreatingGoal(false); }} placeholder="Título de la meta" style={{ flex: 1, minWidth: 0, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 8px', fontSize: '0.74rem', color: C.text, outline: 'none', fontFamily: fontBody }} />
            <button onClick={createAndLink} style={miniBtn}>Crear</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
            <AddLink onClick={() => setGoalPickerOpen(o => !o)}>Vincular meta</AddLink>
            <AddLink onClick={() => setCreatingGoal(true)}>Crear nueva</AddLink>
          </div>
        )}
      </Card>

      {/* ── Archivos adjuntos ── */}
      <Card title="Archivos adjuntos" icon={<Paperclip size={14} color={C.muted} />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {attachments.map(a => (
            <div key={a.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 7, overflow: 'hidden', border: `1px solid ${C.borderEl}`, background: '#1a1d26', cursor: 'pointer' }} onClick={() => onOpenAttachment(a)}>
              {a.type === 'image' ? (
                <img src={a.thumbnail ?? a.url} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 6, textAlign: 'center' }}>
                  <FileText size={18} color={C.muted} />
                  <span style={{ fontSize: '0.56rem', color: C.muted, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{a.name}</span>
                </div>
              )}
              <button className="nb-att-x" onClick={e => { e.stopPropagation(); removeAttachment(a.id); }} style={{ position: 'absolute', top: 3, right: 3, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={10} /></button>
            </div>
          ))}
          <button onClick={() => fileRef.current?.click()} title="Añadir archivo" style={{ aspectRatio: '1', borderRadius: 7, border: `1.5px dashed ${C.borderEl}`, background: 'transparent', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fontBody }}>
            <Plus size={18} />
          </button>
        </div>
        <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
      </Card>
    </div>
  );
}

/* ── custom dropdown ─────────────────────────────────────────────────── */
function Dropdown({ value, options, onSelect }: { value: React.ReactNode; options: { key: string; label: string; color?: string; filled?: boolean }[]; onSelect: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-flex', justifyContent: 'flex-end', width: '100%' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', color: C.text, fontSize: '0.78rem', cursor: 'pointer', fontFamily: fontBody, padding: 0, maxWidth: '100%' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        <ChevronDown size={12} color={C.muted} style={{ flexShrink: 0 }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 41, background: '#1a1d26', border: `1px solid ${C.borderEl}`, borderRadius: 8, padding: 4, minWidth: 150, maxHeight: 220, overflowY: 'auto', boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
            {options.map(o => (
              <button key={o.key} onClick={() => { onSelect(o.key); setOpen(false); }} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 7, background: 'transparent', border: 'none', color: o.color ?? C.text2, padding: '7px 9px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: 6, fontFamily: fontBody }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {o.color && <Dot color={o.color} filled={o.filled} />}{o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── custom date popover ─────────────────────────────────────────────── */
function DatePopover({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [open, setOpen] = useState(false);
  const base = value ? new Date(value + 'T00:00:00') : new Date();
  const [view, setView] = useState(() => new Date(base.getFullYear(), base.getMonth(), 1));
  const grid = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const start = new Date(first); start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [view]);
  const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return (
    <div style={{ position: 'relative', display: 'inline-flex', justifyContent: 'flex-end', width: '100%' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: value ? C.text : C.muted, fontSize: '0.78rem', cursor: 'pointer', fontFamily: fontBody, padding: 0 }}>
        {fmtDate(value)}<CalIcon size={12} color={C.muted} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 41, background: '#1a1d26', border: `1px solid ${C.borderEl}`, borderRadius: 10, padding: 10, width: 220, boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} style={navBtn}>‹</button>
              <span style={{ fontSize: '0.78rem', color: C.text, fontWeight: 600 }}>{MONTHS_SHORT[view.getMonth()]} {view.getFullYear()}</span>
              <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} style={navBtn}>›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i} style={{ fontSize: '0.6rem', color: C.faint, textAlign: 'center', padding: '2px 0' }}>{d}</span>)}
              {grid.map((d, i) => {
                const inMonth = d.getMonth() === view.getMonth(); const sel = value === toISO(d);
                return (
                  <button key={i} onClick={() => { onChange(toISO(d)); setOpen(false); }} style={{ fontSize: '0.72rem', padding: '5px 0', borderRadius: 6, border: 'none', cursor: 'pointer', background: sel ? C.blue : 'transparent', color: sel ? '#fff' : inMonth ? C.text2 : C.faint, fontFamily: fontBody }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }} onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}>{d.getDate()}</button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Dot({ color, filled }: { color: string; filled?: boolean }) {
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: filled ? color : 'transparent', border: `1.5px solid ${color}`, flexShrink: 0, display: 'inline-block' }} />;
}

function GoalRow({ goal, onUnlink }: { goal: Goal; onUnlink: () => void }) {
  const pct = Math.round(goalProgress(goal) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
      <span style={{ width: 16, height: 16, flexShrink: 0, borderRadius: 5, border: `1px solid ${goal.color ?? C.blue}`, background: pct >= 100 ? (goal.color ?? C.blue) : 'transparent' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.78rem', color: C.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</div>
        <div style={{ height: 3, borderRadius: 2, background: '#22252e', marginTop: 4, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: goal.color ?? C.blue }} />
        </div>
      </div>
      <span style={{ fontSize: '0.68rem', color: C.muted, flexShrink: 0 }}>{pct}%</span>
      <button onClick={onUnlink} title="Desvincular" style={{ background: 'transparent', border: 'none', color: C.faint, cursor: 'pointer', display: 'inline-flex', flexShrink: 0 }}><X size={13} /></button>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        {icon}
        <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.85rem', color: C.text }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function PropRow({ label, children, top, onRemove, last }: { label: string; children: React.ReactNode; top?: boolean; onRemove?: () => void; last?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 10, padding: '7px 0', alignItems: top ? 'flex-start' : 'center', minHeight: 32, borderBottom: last ? 'none' : `1px solid ${C.rowBorder}` }}>
      <span style={{ fontSize: '0.76rem', color: C.muted, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {onRemove && <button onClick={onRemove} style={{ background: 'transparent', border: 'none', color: C.faint, cursor: 'pointer', padding: 0, display: 'inline-flex' }}><X size={11} /></button>}
      </span>
      <div style={{ minWidth: 0, display: 'flex', justifyContent: 'flex-end', textAlign: 'right' }}>{children}</div>
    </div>
  );
}

function AddLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '0.74rem', fontFamily: fontBody, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 5 }} onMouseEnter={e => (e.currentTarget.style.color = C.blue)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}><Plus size={12} /> {children}</button>;
}

const tagChip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(79,143,255,0.08)', border: '1px solid rgba(79,143,255,0.2)', borderRadius: 7, padding: '3px 7px', fontSize: '0.7rem', color: '#4f8fff', fontFamily: fontBody };
const miniBtn: React.CSSProperties = { background: C.blue, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody };
const navBtn: React.CSSProperties = { background: 'transparent', border: 'none', color: C.text2, cursor: 'pointer', fontSize: '1rem', padding: '0 6px', lineHeight: 1 };

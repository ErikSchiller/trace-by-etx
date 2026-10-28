import { useRef, useState } from 'react';
import { Plus, X, Paperclip, Target, FileText } from 'lucide-react';
import type { Note, Folder, Attachment, NoteStatus, PropertyValue, PropertyValueType } from '../../store/notebookStore';
import { useUserGoals, useGoalsStore, goalProgress, type Goal } from '../../store/goalsStore';
import { processImageForUpload } from '../../utils/imageProcessing';

const fontBody = "'Space Grotesk', sans-serif";
const fontHead = "'Syne', sans-serif";
const C = {
  card: '#15171d', border: '#1e2029', borderEl: '#2a2c33', bg: '#0d0d0f',
  blue: '#4f8fff', green: '#22c55e', text: '#f7f8fa', text2: '#d0d0dc', muted: '#6b7280', faint: '#4a4a60',
};

const STATUS_LABEL: Record<NoteStatus, string> = { borrador: 'Borrador', en_progreso: 'En progreso', completado: 'Completado', archivado: 'Archivado' };
const STATUS_COLOR: Record<NoteStatus, string> = { borrador: '#6b7280', en_progreso: '#f59e0b', completado: '#22c55e', archivado: '#4a4a60' };
const PROP_TYPES: { v: PropertyValueType; label: string }[] = [
  { v: 'text', label: 'Texto' }, { v: 'number', label: 'Número' }, { v: 'date', label: 'Fecha' },
  { v: 'select', label: 'Select' }, { v: 'checkbox', label: 'Checkbox' }, { v: 'url', label: 'URL' },
];
const MAX_FILE = 2 * 1024 * 1024;

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
    const cf = { ...(props.customFields ?? {}) };
    cf[name] = { ...cf[name], value };
    setProps({ customFields: cf });
  };
  const removeCustomField = (name: string) => {
    const cf = { ...(props.customFields ?? {}) }; delete cf[name];
    setProps({ customFields: cf });
  };

  const linkGoal = (goalId: string) => {
    onUpdate({ linkedGoalIds: Array.from(new Set([...linkedIds, goalId])) });
    linkNoteToGoal(goalId, note.id);
    setGoalPickerOpen(false);
  };
  const unlinkGoal = (goalId: string) => {
    onUpdate({ linkedGoalIds: linkedIds.filter(id => id !== goalId) });
    unlinkNoteFromGoal(goalId, note.id);
  };
  const createAndLink = () => {
    const title = newGoalTitle.trim();
    if (!title) return;
    const g = addGoal({ title, category: 'personal', type: 'milestone', linkedNoteIds: [note.id] });
    onUpdate({ linkedGoalIds: [...linkedIds, g.id] });
    setNewGoalTitle(''); setCreatingGoal(false);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      try {
        if (file.type.startsWith('image/')) {
          const dataUrl = await processImageForUpload(file);
          const att: Attachment = { id: crypto.randomUUID(), type: 'image', url: dataUrl, name: file.name, size: file.size, thumbnail: dataUrl };
          onUpdate({ attachments: [...(note.attachments ?? []), att] });
        } else if (file.size <= MAX_FILE) {
          const dataUrl: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
          const att: Attachment = { id: crypto.randomUUID(), type: 'file', url: dataUrl, name: file.name, size: file.size };
          onUpdate({ attachments: [...(note.attachments ?? []), att] });
        } else {
          onToast('error', `${file.name} supera 2MB — demasiado grande para adjuntar`);
        }
      } catch { onToast('error', 'No se pudo adjuntar el archivo'); }
    }
  };
  const removeAttachment = (id: string) => onUpdate({ attachments: attachments.filter(a => a.id !== id) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: fontBody }}>
      {/* ── Propiedades ── */}
      <Card title="Propiedades">
        <PropRow label="Colección">
          <select value={note.folderId} onChange={e => onMove(e.target.value)} style={selectStyle}>
            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </PropRow>
        <PropRow label="Fecha">
          <input type="date" value={(props.date ?? note.date ?? '').slice(0, 10)} onChange={e => setProps({ date: e.target.value })} style={{ ...selectStyle, colorScheme: 'dark' }} />
        </PropRow>
        <PropRow label="Estado">
          <select value={props.status ?? ''} onChange={e => setProps({ status: (e.target.value || undefined) as NoteStatus })} style={{ ...selectStyle, color: props.status ? STATUS_COLOR[props.status] : C.muted }}>
            <option value="">—</option>
            {(Object.keys(STATUS_LABEL) as NoteStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </PropRow>
        <PropRow label="Etiquetas" top>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'flex-end' }}>
            {note.tags.map(t => (
              <button key={t} onClick={() => onUpdate({ tags: note.tags.filter(x => x !== t) })} style={chip}>{t} ✕</button>
            ))}
            <input value={tagInput} onChange={e => { const v = e.target.value; if (v.endsWith(',')) addTag(v); else setTagInput(v); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
              placeholder="+ etiqueta" style={{ background: 'transparent', border: 'none', outline: 'none', color: C.text2, fontSize: '0.72rem', fontFamily: fontBody, width: 64, textAlign: 'right' }} />
          </div>
        </PropRow>

        {/* Custom fields */}
        {Object.entries(props.customFields ?? {}).map(([name, pv]) => (
          <PropRow key={name} label={name} onRemove={() => removeCustomField(name)}>
            {pv.type === 'checkbox' ? (
              <input type="checkbox" checked={!!pv.value} onChange={e => setCustomValue(name, e.target.checked)} style={{ accentColor: C.blue }} />
            ) : (
              <input type={pv.type === 'number' ? 'number' : pv.type === 'date' ? 'date' : pv.type === 'url' ? 'url' : 'text'}
                value={String(pv.value ?? '')} onChange={e => setCustomValue(name, e.target.value)} placeholder="—"
                style={{ ...selectStyle, colorScheme: 'dark' }} />
            )}
          </PropRow>
        ))}

        {addPropOpen ? (
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <input autoFocus value={propName} onChange={e => setPropName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCustomField(); }} placeholder="Nombre" style={{ flex: 1, minWidth: 0, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 8px', fontSize: '0.74rem', color: C.text, outline: 'none', fontFamily: fontBody }} />
            <select value={propType} onChange={e => setPropType(e.target.value as PropertyValueType)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px', fontSize: '0.72rem', color: C.text2, outline: 'none', fontFamily: fontBody }}>
              {PROP_TYPES.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
            </select>
            <button onClick={addCustomField} style={miniBtn}>OK</button>
          </div>
        ) : (
          <AddLink onClick={() => setAddPropOpen(true)}>Añadir propiedad</AddLink>
        )}
      </Card>

      {/* ── Metas relacionadas ── */}
      <Card title="Metas relacionadas" icon={<Target size={13} color={C.muted} />}>
        {linkedGoals.length === 0 && <div style={{ fontSize: '0.74rem', color: C.faint, padding: '2px 0 8px' }}>Sin metas vinculadas</div>}
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
          <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
            <AddLink onClick={() => setGoalPickerOpen(o => !o)}>Vincular meta</AddLink>
            <AddLink onClick={() => setCreatingGoal(true)}>Crear nueva</AddLink>
          </div>
        )}
      </Card>

      {/* ── Archivos adjuntos ── */}
      <Card title="Archivos adjuntos" icon={<Paperclip size={13} color={C.muted} />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {attachments.map(a => (
            <div key={a.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}`, background: C.bg, cursor: 'pointer' }} onClick={() => onOpenAttachment(a)}>
              {a.type === 'image' ? (
                <img src={a.thumbnail ?? a.url} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 6, textAlign: 'center' }}>
                  <FileText size={20} color={C.muted} />
                  <span style={{ fontSize: '0.58rem', color: C.muted, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{a.name}</span>
                </div>
              )}
              <button onClick={e => { e.stopPropagation(); removeAttachment(a.id); }} style={{ position: 'absolute', top: 3, right: 3, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={10} /></button>
            </div>
          ))}
          <button onClick={() => fileRef.current?.click()} style={{ aspectRatio: '1', borderRadius: 8, border: `1.5px dashed ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, fontFamily: fontBody }}>
            <Plus size={18} /><span style={{ fontSize: '0.56rem' }}>Añadir</span>
          </button>
        </div>
        <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
      </Card>
    </div>
  );
}

function GoalRow({ goal, onUnlink }: { goal: Goal; onUnlink: () => void }) {
  const pct = Math.round(goalProgress(goal) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: goal.color ?? C.blue, flexShrink: 0 }} />
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
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        {icon}
        <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.84rem', color: C.text }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function PropRow({ label, children, top, onRemove }: { label: string; children: React.ReactNode; top?: boolean; onRemove?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: top ? 'flex-start' : 'center', gap: 10, padding: '7px 0' }}>
      <span style={{ fontSize: '0.74rem', color: C.muted, minWidth: 80, display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {onRemove && <button onClick={onRemove} style={{ background: 'transparent', border: 'none', color: C.faint, cursor: 'pointer', padding: 0, display: 'inline-flex' }}><X size={11} /></button>}
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end', textAlign: 'right' }}>{children}</div>
    </div>
  );
}

function AddLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '0.74rem', fontFamily: fontBody, padding: '8px 0 0', display: 'inline-flex', alignItems: 'center', gap: 5 }} onMouseEnter={e => (e.currentTarget.style.color = C.blue)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}><Plus size={12} /> {children}</button>;
}

const selectStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', outline: 'none', color: C.text2, fontSize: '0.78rem',
  fontFamily: fontBody, textAlign: 'right', cursor: 'pointer', maxWidth: 160, direction: 'rtl',
};
const chip: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: '0.68rem', color: '#a1ab88', cursor: 'pointer', fontFamily: fontBody };
const miniBtn: React.CSSProperties = { background: C.blue, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody };

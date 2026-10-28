import { useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import { Search, X, FileText, Trash2 } from 'lucide-react';
import {
  NOTE_TEMPLATES, CATEGORY_LABEL, CATEGORY_ORDER, templateThumbBackground, instantiateTemplate,
  type NoteTemplate, type TemplateCategory,
} from '../../data/noteTemplates';
import { useNotebookStore, type Block, type NoteCover, type NoteProperties } from '../../store/notebookStore';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const C = {
  bg: '#0a0a0c', card: '#151519', card2: '#131418', border: '#1e2029', borderEl: '#2a2c33',
  blue: '#4f8fff', red: '#ef4444', text: '#f7f8fa', text2: '#d0d0dc', muted: '#6b7280', faint: '#4a4a60',
};

export interface CreateFields { title: string; blocks: Block[]; cover?: NoteCover; properties?: NoteProperties; tags: string[] }

type Tab = 'plantillas' | 'mias' | 'blanco';

export function TemplatePicker({ onCreate, onBlank, onClose }: {
  onCreate: (fields: CreateFields) => void;
  onBlank: () => void;
  onClose: () => void;
}) {
  const customTemplates = useNotebookStore(s => s.customTemplates);
  const deleteCustom = useNotebookStore(s => s.deleteCustomTemplate);
  const [tab, setTab] = useState<Tab>('plantillas');
  const [cat, setCat] = useState<TemplateCategory | 'todas'>('todas');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    let list = NOTE_TEMPLATES;
    if (cat !== 'todas') list = list.filter(t => t.category === cat);
    if (q.trim()) { const s = q.toLowerCase(); list = list.filter(t => t.title.toLowerCase().includes(s) || t.description.toLowerCase().includes(s)); }
    return list;
  }, [cat, q]);

  const pickDefault = (t: NoteTemplate) => onCreate(instantiateTemplate(t));
  const pickCustom = (t: typeof customTemplates[number]) => onCreate({
    title: t.title,
    blocks: t.blocks.map(b => ({ ...b, id: nanoid() })),
    cover: t.cover, properties: t.properties, tags: t.tags ?? [],
  });

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, border: `1px solid ${C.borderEl}`, borderRadius: 16, width: '100%', maxWidth: 1000, height: '82vh', maxHeight: 760, display: 'flex', flexDirection: 'column', fontFamily: fontBody, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
        {/* header: title + tabs + search */}
        <div style={{ padding: '20px 24px 0', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.3rem', color: C.text, margin: 0 }}>Nueva nota</h2>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', display: 'inline-flex' }}><X size={20} /></button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {([['plantillas', 'Plantillas'], ['mias', 'Mis plantillas'], ['blanco', 'En blanco']] as [Tab, string][]).map(([k, lbl]) => (
                <button key={k} onClick={() => setTab(k)} style={{ background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === k ? C.blue : 'transparent'}`, color: tab === k ? C.text : C.muted, padding: '10px 6px', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}>{lbl}</button>
              ))}
            </div>
            {tab === 'plantillas' && (
              <div style={{ position: 'relative', width: 220 }}>
                <Search size={14} color={C.muted} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar plantillas..." style={{ width: '100%', boxSizing: 'border-box', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px 8px 32px', fontSize: '0.8rem', color: C.text, outline: 'none', fontFamily: fontBody }} />
              </div>
            )}
          </div>
          {tab === 'plantillas' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '14px 0' }}>
              {(['todas', ...CATEGORY_ORDER] as const).map(c => {
                const active = cat === c;
                return (
                  <button key={c} onClick={() => setCat(c)} style={{ background: active ? 'rgba(79,143,255,0.1)' : 'transparent', border: `1px solid ${active ? 'rgba(79,143,255,0.4)' : C.border}`, color: active ? C.blue : C.muted, borderRadius: 16, padding: '6px 14px', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', fontFamily: fontBody }}>
                    {c === 'todas' ? 'Todas' : CATEGORY_LABEL[c]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {tab === 'blanco' && (
            <button onClick={onBlank} style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: C.card, border: `1.5px dashed ${C.borderEl}`, borderRadius: 12, padding: '48px 24px', cursor: 'pointer', color: C.text2, fontFamily: fontBody, margin: '0 auto' }}>
              <FileText size={32} color={C.muted} />
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: C.text }}>Nota en blanco</span>
              <span style={{ fontSize: '0.78rem', color: C.muted }}>Empieza desde cero</span>
            </button>
          )}

          {tab === 'mias' && (
            customTemplates.length === 0 ? (
              <div style={{ textAlign: 'center', color: C.muted, padding: 60, fontSize: '0.85rem' }}>
                No tienes plantillas propias.<br />Guarda cualquier nota como plantilla desde su menú ⋯
              </div>
            ) : (
              <Grid>
                {customTemplates.map(t => (
                  <TemplateCard key={t.id} title={t.title} description={t.description} bg={t.cover?.color ?? 'linear-gradient(135deg,#312e81,#8b5cf6)'} onClick={() => pickCustom(t)}
                    onDelete={() => deleteCustom(t.id)} />
                ))}
              </Grid>
            )
          )}

          {tab === 'plantillas' && (
            filtered.length === 0 ? (
              <div style={{ textAlign: 'center', color: C.muted, padding: 60, fontSize: '0.85rem' }}>Sin plantillas para “{q}”</div>
            ) : (
              <Grid>
                {filtered.map(t => (
                  <TemplateCard key={t.id} title={t.title} description={t.description} bg={templateThumbBackground(t)} onClick={() => pickDefault(t)} />
                ))}
              </Grid>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>{children}</div>;
}

function TemplateCard({ title, description, bg, onClick, onDelete }: { title: string; description: string; bg: string; onClick: () => void; onDelete?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onClick}
      style={{ position: 'relative', background: C.card, border: `1px solid ${hover ? 'rgba(79,143,255,0.5)' : C.border}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transform: hover ? 'scale(1.02)' : 'scale(1)', transition: 'transform 0.12s, border-color 0.12s' }}>
      <div style={{ height: 118, background: bg }} />
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.92rem', color: C.text, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: '0.74rem', color: C.muted, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{description}</div>
      </div>
      {onDelete && hover && (
        <button onClick={e => { e.stopPropagation(); onDelete(); }} title="Eliminar plantilla" style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 7, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13} /></button>
      )}
    </div>
  );
}

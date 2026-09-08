import { useEffect, useRef, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { nanoid } from 'nanoid';
import {
  FileText, GripVertical, MoreHorizontal, Type, Heading2, Heading3, Quote,
  Lightbulb, ListChecks, TrendingUp, Image as ImageIcon, Minus, Code2,
  type LucideIcon,
} from 'lucide-react';
import { type Block, type BlockType, type ChecklistItem, newBlock } from '../../store/notebookStore';
import type { Trade } from '../../store/tradeStore';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const C = {
  bg: '#0a0a0c', card: '#151519', card2: '#131418', border: '#1e2029', borderEl: '#2a2c33',
  blue: '#4f8fff', red: '#ef4444',
  text: '#f7f8fa', text2: '#d0d0dc', text3: '#8a8a99', muted: '#6b7280', olive: '#a1ab88',
};

const SLASH_OPTIONS: { type: BlockType; label: string; Icon: LucideIcon; level?: 2 | 3 }[] = [
  { type: 'heading', label: 'Encabezado 2', Icon: Heading2, level: 2 },
  { type: 'heading', label: 'Encabezado 3', Icon: Heading3, level: 3 },
  { type: 'paragraph', label: 'Texto', Icon: Type },
  { type: 'quote', label: 'Cita', Icon: Quote },
  { type: 'callout', label: 'Callout', Icon: Lightbulb },
  { type: 'checklist', label: 'Checklist', Icon: ListChecks },
  { type: 'trade', label: 'Operación', Icon: TrendingUp },
  { type: 'image', label: 'Imagen', Icon: ImageIcon },
  { type: 'divider', label: 'Separador', Icon: Minus },
  { type: 'code', label: 'Código', Icon: Code2 },
];

/* ── EditableText: uncontrolled contentEditable with key events ──────────── */
interface EditableProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
  multiline?: boolean;
  onEnter?: () => void;
  onBackspaceEmpty?: () => void;
  onSlash?: (rect: DOMRect) => void;
  registerFocus?: (fn: () => void) => void;
}
export function EditableText({ value, onChange, placeholder, style, className, multiline, onEnter, onBackspaceEmpty, onSlash, registerFocus }: EditableProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Sync DOM to external value changes (note switch, block conversion), but never
  // while the user is typing in this element (would fight the caret).
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (document.activeElement !== el && el.innerText !== value) el.innerText = value;
  }, [value]);
  useEffect(() => {
    if (registerFocus) registerFocus(() => {
      const el = ref.current; if (!el) return;
      el.focus();
      const range = document.createRange(); range.selectNodeContents(el); range.collapse(false);
      const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(range);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={className}
      data-empty={!value}
      data-placeholder={placeholder}
      onInput={e => {
        const text = e.currentTarget.innerText;
        if (text === '/' && onSlash) onSlash(e.currentTarget.getBoundingClientRect());
        onChange(text.replace(/\n$/, ''));
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' && !multiline && onEnter) { e.preventDefault(); onEnter(); }
        if (e.key === 'Backspace' && onBackspaceEmpty && (e.currentTarget.innerText === '' || e.currentTarget.innerText === '\n')) {
          e.preventDefault(); onBackspaceEmpty();
        }
      }}
      style={{ outline: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...style }}
    />
  );
}

/* ── Trade sparkline (placeholder shape by result) ──────────────────────── */
function Sparkline({ trade }: { trade?: Trade }) {
  const win = (trade?.pnl ?? 0) >= 0;
  const color = win ? C.blue : C.red;
  const pts = win ? '0,50 30,42 55,30 80,34 105,14 140,4' : '0,10 30,18 55,14 80,30 105,40 140,56';
  return (
    <svg width={140} height={60} viewBox="0 0 140 60" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={`sg-${win ? 'w' : 'l'}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pts} 140,60 0,60`} fill={`url(#sg-${win ? 'w' : 'l'})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ── Trade block ─────────────────────────────────────────────────────────── */
function TradeBlock({ tradeId, trades, onOpen }: { tradeId?: string; trades: Trade[]; onOpen: (id: string) => void }) {
  const trade = trades.find(t => t.id === tradeId);
  const dirColor = trade ? (trade.direction === 'long' ? C.blue : C.red) : C.muted;
  const pnl = trade?.pnl ?? 0;
  const pnlColor = pnl >= 0 ? C.blue : C.red;
  const fmtPnl = (n: number) => `${n >= 0 ? '+' : '-'}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  return (
    <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 22px', margin: '24px 0', display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 24, alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
        <FileText size={16} color={C.muted} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ minWidth: 0 }}>
          {trade ? (
            <>
              <div style={{ fontFamily: fontBody, fontSize: '0.95rem', color: C.text, fontWeight: 700 }}>
                {trade.asset} · <span style={{ color: dirColor }}>{trade.direction.toUpperCase()}</span> · <span style={{ color: pnlColor, fontWeight: 800 }}>{fmtPnl(pnl)}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: 4 }}>
                {trade.date} {trade.time} · R:R {trade.realRR.toFixed(2)}{trade.setup ? ` · ${trade.setup}` : ''}
              </div>
              {trade.quickNote && <div style={{ fontSize: '0.78rem', color: C.olive, marginTop: 6, fontStyle: 'italic', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{trade.quickNote}</div>}
            </>
          ) : (
            <div style={{ fontSize: '0.85rem', color: C.muted }}>Operación no encontrada</div>
          )}
        </div>
      </div>
      <Sparkline trade={trade} />
      {trade ? (
        <button
          onClick={() => onOpen(trade.id)}
          style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, borderRadius: 8, padding: '8px 14px', fontSize: '0.78rem', cursor: 'pointer', fontFamily: fontBody, whiteSpace: 'nowrap' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = C.borderEl; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}
        >Ver operación →</button>
      ) : <span />}
    </div>
  );
}

/* ── Single sortable block ──────────────────────────────────────────────── */
interface BlockRowProps {
  block: Block;
  trades: Trade[];
  focusMode: boolean;
  onChange: (patch: Block) => void;
  onEnterAfter: () => void;
  onDelete: () => void;
  onSlash: (rect: DOMRect) => void;
  onDuplicate: () => void;
  onConvert: (type: BlockType, level?: 2 | 3) => void;
  onOpenTrade: (id: string) => void;
  onOpenImage: (dataUrl: string, caption?: string) => void;
  registerFocus: (fn: () => void) => void;
}
function BlockRow(p: BlockRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.block.id });
  const [menuOpen, setMenuOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform), transition,
    opacity: isDragging ? 0.4 : 1, position: 'relative',
  };
  const b = p.block;

  const body = (() => {
    switch (b.type) {
      case 'heading': {
        const lvl = b.content.level ?? 2;
        return (
          <EditableText
            value={b.content.text ?? ''}
            placeholder={lvl === 2 ? 'Encabezado' : 'Subencabezado'}
            onChange={t => p.onChange({ ...b, content: { ...b.content, text: t } })}
            onEnter={p.onEnterAfter} onBackspaceEmpty={p.onDelete} onSlash={p.onSlash}
            registerFocus={p.registerFocus}
            style={{ fontFamily: fontHead, fontWeight: 800, fontSize: lvl === 2 ? '1.5rem' : '1.2rem', letterSpacing: '-0.01em', color: C.text, margin: lvl === 2 ? '32px 0 16px' : '24px 0 10px', lineHeight: 1.25 }}
          />
        );
      }
      case 'paragraph':
        return (
          <EditableText
            value={b.content.text ?? ''} placeholder="Escribe algo, o pulsa / para comandos"
            onChange={t => p.onChange({ ...b, content: { ...b.content, text: t } })}
            onEnter={p.onEnterAfter} onBackspaceEmpty={p.onDelete} onSlash={p.onSlash} multiline
            registerFocus={p.registerFocus}
            style={{ fontSize: '1rem', color: C.text2, lineHeight: 1.75, margin: '0 0 20px' }}
          />
        );
      case 'callout':
        return (
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.blue}`, borderRadius: 8, padding: '20px 24px', margin: '24px 0' }}>
            <EditableText
              value={b.content.heading ?? ''} placeholder="Título del callout"
              onChange={t => p.onChange({ ...b, content: { ...b.content, heading: t } })}
              registerFocus={p.registerFocus}
              style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1.15rem', color: C.text, marginBottom: 12 }}
            />
            <EditableText
              value={b.content.text ?? ''} placeholder="Escribe el contenido…" multiline
              onChange={t => p.onChange({ ...b, content: { ...b.content, text: t } })}
              onBackspaceEmpty={!b.content.heading && !b.content.text ? p.onDelete : undefined}
              style={{ fontSize: '0.95rem', color: C.text2, lineHeight: 1.7 }}
            />
          </div>
        );
      case 'checklist': {
        const items = b.content.items ?? [];
        const setItems = (next: ChecklistItem[]) => p.onChange({ ...b, content: { ...b.content, items: next } });
        return (
          <div style={{ margin: '16px 0' }}>
            {items.map((it, i) => (
              <div key={it.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <button
                  onClick={() => setItems(items.map(x => x.id === it.id ? { ...x, checked: !x.checked } : x))}
                  style={{ width: 20, height: 20, flexShrink: 0, marginTop: 2, borderRadius: 5, border: `1px solid ${it.checked ? C.blue : C.borderEl}`, background: it.checked ? C.blue : 'transparent', color: '#fff', cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                >{it.checked ? '✓' : ''}</button>
                <EditableText
                  value={it.text} placeholder="Elemento…"
                  registerFocus={i === 0 ? p.registerFocus : undefined}
                  onChange={t => setItems(items.map(x => x.id === it.id ? { ...x, text: t } : x))}
                  onEnter={() => { const ni = { id: nanoid(), text: '', checked: false }; const next = [...items]; next.splice(i + 1, 0, ni); setItems(next); }}
                  onBackspaceEmpty={() => { if (items.length === 1) p.onDelete(); else setItems(items.filter(x => x.id !== it.id)); }}
                  style={{ flex: 1, fontSize: '0.92rem', color: it.checked ? C.muted : C.text2, textDecoration: it.checked ? 'line-through' : 'none', lineHeight: 1.5 }}
                />
              </div>
            ))}
            <button onClick={() => setItems([...items, { id: nanoid(), text: '', checked: false }])} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '0.78rem', fontFamily: fontBody, padding: '2px 0' }}>＋ Añadir elemento</button>
          </div>
        );
      }
      case 'trade':
        return <TradeBlock tradeId={b.content.tradeId} trades={p.trades} onOpen={p.onOpenTrade} />;
      case 'image':
        return b.content.dataUrl ? (
          <figure style={{ margin: '24px 0' }}>
            <div style={{ borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${C.border}` }} onClick={() => p.onOpenImage(b.content.dataUrl!, b.content.caption)}>
              <img src={b.content.dataUrl} alt={b.content.caption ?? ''} style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
            </div>
            <EditableText
              value={b.content.caption ?? ''} placeholder="Añade un pie de foto…"
              onChange={t => p.onChange({ ...b, content: { ...b.content, caption: t } })}
              style={{ fontSize: '0.75rem', color: C.muted, textAlign: 'center', marginTop: 8 }}
            />
          </figure>
        ) : <div style={{ color: C.muted, fontSize: '0.85rem', margin: '16px 0' }}>Imagen vacía</div>;
      case 'divider':
        return <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '32px 0' }} />;
      case 'code':
        return (
          <EditableText
            value={b.content.text ?? ''} placeholder="Código…" multiline
            onChange={t => p.onChange({ ...b, content: { ...b.content, text: t } })}
            onBackspaceEmpty={p.onDelete} registerFocus={p.registerFocus}
            style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px', fontFamily: "ui-monospace, 'Space Grotesk', monospace", fontSize: '0.85rem', color: C.text2, margin: '24px 0', overflowX: 'auto' }}
          />
        );
      case 'quote':
        return (
          <EditableText
            value={b.content.text ?? ''} placeholder="Cita…" multiline
            onChange={t => p.onChange({ ...b, content: { ...b.content, text: t } })}
            onBackspaceEmpty={p.onDelete} registerFocus={p.registerFocus}
            style={{ borderLeft: `3px solid ${C.blue}`, paddingLeft: 16, margin: '24px 0', fontStyle: 'italic', color: C.olive, fontSize: '1.05rem', lineHeight: 1.6 }}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <div ref={setNodeRef} style={style} className="nb-block">
      {!p.focusMode && (
        <div className="nb-block-gutter" style={{ position: 'absolute', left: -48, top: 2, display: 'flex', gap: 1, alignItems: 'center', opacity: 0, transition: 'opacity 0.12s' }}>
          <span {...attributes} {...listeners} title="Arrastrar" style={{ cursor: 'grab', color: C.muted, display: 'inline-flex', padding: '2px', touchAction: 'none' }}><GripVertical size={15} /></span>
          <button onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); setConvertOpen(false); }} title="Opciones" style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', display: 'inline-flex', padding: '2px' }}><MoreHorizontal size={15} /></button>
        </div>
      )}
      {menuOpen && (
        <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', left: -48, top: 26, zIndex: 30, background: C.card, border: `1px solid ${C.borderEl}`, borderRadius: 10, padding: 4, minWidth: 180, boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
          <MiniRow onClick={() => { p.onDuplicate(); setMenuOpen(false); }}>Duplicar</MiniRow>
          <MiniRow onClick={() => setConvertOpen(v => !v)}>Convertir a ▸</MiniRow>
          {convertOpen && (
            <div style={{ maxHeight: 220, overflowY: 'auto', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, margin: '4px 0' }}>
              {SLASH_OPTIONS.filter(o => o.type !== 'trade' && o.type !== 'image').map(o => (
                <MiniRow key={o.label} Icon={o.Icon} onClick={() => { p.onConvert(o.type, o.level); setMenuOpen(false); setConvertOpen(false); }}>{o.label}</MiniRow>
              ))}
            </div>
          )}
          <MiniRow danger onClick={() => { p.onDelete(); setMenuOpen(false); }}>Eliminar</MiniRow>
        </div>
      )}
      {body}
    </div>
  );
}

function MiniRow({ children, onClick, danger, Icon }: { children: React.ReactNode; onClick: () => void; danger?: boolean; Icon?: LucideIcon }) {
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: danger ? C.red : C.text2, padding: '8px 10px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: 6, fontFamily: fontBody, display: 'flex', gap: 9, alignItems: 'center' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      {Icon && <Icon size={15} color={danger ? C.red : C.muted} />}{children}
    </button>
  );
}

/* ── BlockList: owns the block sequence ─────────────────────────────────── */
export interface BlockListProps {
  blocks: Block[];
  trades: Trade[];
  focusMode: boolean;
  onChange: (blocks: Block[]) => void;
  onOpenTrade: (id: string) => void;
  onOpenImage: (dataUrl: string, caption?: string) => void;
  onPickTrade: (insertAfter: number) => void;
  onPickImage: (insertAfter: number) => void;
  /** External focus request (e.g. a toolbar-inserted block). */
  focusId?: string | null;
  onFocusHandled?: () => void;
}
export function BlockList(p: BlockListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const focusMap = useRef<Record<string, () => void>>({});
  const [slashMenu, setSlashMenu] = useState<{ index: number; x: number; y: number } | null>(null);
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);

  useEffect(() => {
    if (pendingFocus && focusMap.current[pendingFocus]) { focusMap.current[pendingFocus](); setPendingFocus(null); }
  }, [pendingFocus, p.blocks]);

  useEffect(() => {
    if (p.focusId && focusMap.current[p.focusId]) { focusMap.current[p.focusId](); p.onFocusHandled?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.focusId, p.blocks]);

  const set = (blocks: Block[]) => p.onChange(blocks);
  const updateAt = (i: number, patch: Block) => { const next = [...p.blocks]; next[i] = patch; set(next); };
  const insertAt = (i: number, block: Block, focus = true) => {
    const next = [...p.blocks]; next.splice(i, 0, block); set(next);
    if (focus) setPendingFocus(block.id);
  };
  const removeAt = (i: number) => {
    if (p.blocks.length === 1) { set([newBlock('paragraph', { text: '' })]); return; }
    const prev = p.blocks[i - 1];
    const next = p.blocks.filter((_, j) => j !== i); set(next);
    if (prev) setPendingFocus(prev.id);
  };
  const convertAt = (i: number, type: BlockType, level?: 2 | 3) => {
    const b = p.blocks[i];
    // Drop a leading "/" left over from the slash command trigger.
    const text = (b.content.text ?? b.content.heading ?? '').replace(/^\//, '');
    let content: Block['content'] = {};
    if (type === 'heading') content = { level: level ?? 2, text };
    else if (type === 'checklist') content = { items: [{ id: nanoid(), text, checked: false }] };
    else if (type === 'callout') content = { heading: '', text };
    else if (type === 'divider') content = {};
    else content = { text };
    updateAt(i, { ...b, type, content });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = p.blocks.map(b => b.id);
    set(arrayMove(p.blocks, ids.indexOf(active.id as string), ids.indexOf(over.id as string)));
  };

  const pickSlash = (type: BlockType, level?: 2 | 3) => {
    if (!slashMenu) return;
    const i = slashMenu.index;
    if (type === 'trade') { removeSlashChar(i); p.onPickTrade(i); setSlashMenu(null); return; }
    if (type === 'image') { removeSlashChar(i); p.onPickImage(i); setSlashMenu(null); return; }
    convertAt(i, type, level);
    setSlashMenu(null);
    setPendingFocus(p.blocks[i].id);
  };
  const removeSlashChar = (i: number) => { const b = p.blocks[i]; updateAt(i, { ...b, content: { ...b.content, text: '' } }); };

  return (
    <div style={{ position: 'relative' }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={p.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
          {p.blocks.map((b, i) => (
            <BlockRow
              key={b.id}
              block={b}
              trades={p.trades}
              focusMode={p.focusMode}
              onChange={patch => updateAt(i, patch)}
              onEnterAfter={() => insertAt(i + 1, newBlock('paragraph', { text: '' }))}
              onDelete={() => removeAt(i)}
              onSlash={rect => setSlashMenu({ index: i, x: rect.left, y: rect.bottom + 4 })}
              onDuplicate={() => insertAt(i + 1, { ...b, id: nanoid() }, false)}
              onConvert={(type, level) => convertAt(i, type, level)}
              onOpenTrade={p.onOpenTrade}
              onOpenImage={p.onOpenImage}
              registerFocus={fn => { focusMap.current[b.id] = fn; }}
            />
          ))}
        </SortableContext>
      </DndContext>

      {slashMenu && (
        <>
          <div onClick={() => setSlashMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 45 }} />
          <div style={{ position: 'fixed', left: Math.min(slashMenu.x, window.innerWidth - 220), top: slashMenu.y, zIndex: 46, background: C.card, border: `1px solid ${C.borderEl}`, borderRadius: 10, padding: 4, minWidth: 200, maxHeight: 300, overflowY: 'auto', boxShadow: '0 16px 40px rgba(0,0,0,0.55)' }}>
            {SLASH_OPTIONS.map(o => (
              <MiniRow key={o.label} Icon={o.Icon} onClick={() => pickSlash(o.type, o.level)}>{o.label}</MiniRow>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

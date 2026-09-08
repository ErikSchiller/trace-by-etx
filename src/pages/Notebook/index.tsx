import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useNotebookStore, useUserFolders, useUserNotes,
  DEFAULT_FOLDER_NAMES, ensureBlocks, newBlock,
  type Folder, type Note, type Block,
} from '../../store/notebookStore';
import { useUserTrades, type Trade } from '../../store/tradeStore';
import { useToast } from '../../components/UI/ToastProvider';
import { usePlan } from '../../hooks/usePlan';
import { useUpgradeModal } from '../../store/upgradeModalStore';
import { ConfirmDialog } from '../../components/UI/ConfirmDialog';
import { EmojiPicker } from '../../components/UI/EmojiPicker';
import { ImageLightbox } from '../../components/UI/ImageLightbox';
import { TradeDetailModal } from '../../components/Modals/TradeDetailModal';
import { checkFirstNoteMilestone } from '../../utils/milestones';
import { processImageForUpload } from '../../utils/imageProcessing';
import { nodeToPngBlob } from '../../utils/domImage';
import { BlockList, EditableText } from './NotebookBlocks';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const C = {
  bg: '#0a0a0c', card: '#15171d', border: '#1e2029', blue: '#4f8fff', red: '#ef4444',
  text: '#f7f8fa', text2: '#c8c8d8', muted: '#6b7280', olive: '#a1ab88',
};

function isProtected(f: Folder) { return !!f.system || !!f.isDefault || DEFAULT_FOLDER_NAMES.includes(f.name); }
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function shortDate(iso: string) { const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
function metaDate(iso: string) { const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()].toUpperCase()} ${d.getFullYear()}`; }
function preview(text: string) { return text.replace(/\s+/g, ' ').trim().slice(0, 120); }

type View = 'all' | 'favorites' | string;

export function Notebook() {
  const folders = useUserFolders();
  const notes = useUserNotes();
  const trades = useUserTrades();
  const ensureDefaults = useNotebookStore(s => s.ensureDefaultFolders);
  const addFolder = useNotebookStore(s => s.addFolder);
  const updateFolder = useNotebookStore(s => s.updateFolder);
  const deleteFolder = useNotebookStore(s => s.deleteFolder);
  const reorderFolders = useNotebookStore(s => s.reorderFolders);
  const addNote = useNotebookStore(s => s.addNote);
  const updateNote = useNotebookStore(s => s.updateNote);
  const deleteNote = useNotebookStore(s => s.deleteNote);
  const toggleFavorite = useNotebookStore(s => s.toggleFavorite);
  const duplicateNoteStore = useNotebookStore(s => s.duplicateNote);
  const moveNoteStore = useNotebookStore(s => s.moveNote);
  const { push } = useToast();
  const { isAtFolderLimit, isFree } = usePlan();
  const openUpgrade = useUpgradeModal(s => s.open);

  useEffect(() => { ensureDefaults(); }, [ensureDefaults]);

  // ── selection / view ──
  const [view, setView] = useState<View>('all');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [focusMode, setFocusMode] = useState(false);

  // ── collection editing ──
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('🗂️');
  const [newFolderPicker, setNewFolderPicker] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ folderId: string; x: number; y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [iconPickerId, setIconPickerId] = useState<string | null>(null);
  const [confirmFolderId, setConfirmFolderId] = useState<string | null>(null);

  // ── note actions ──
  const [noteMenuOpen, setNoteMenuOpen] = useState(false);
  const [movePickerOpen, setMovePickerOpen] = useState(false);
  const [confirmNoteId, setConfirmNoteId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // ── block insert helpers ──
  const [tradePicker, setTradePicker] = useState<{ insertAfter: number } | null>(null);
  const imageInsertRef = useRef<number | null>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [detailTrade, setDetailTrade] = useState<Trade | null>(null);

  // ── editor draft (local, autosaved) ──
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSubtitle, setDraftSubtitle] = useState('');
  const [draftSession, setDraftSession] = useState('');
  const [draftBlocks, setDraftBlocks] = useState<Block[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId) || null, [notes, activeNoteId]);

  // filtered notes for the middle-column list
  const searching = search.trim().length > 0;
  const listNotes = useMemo(() => {
    let list = notes;
    if (searching) {
      const q = search.toLowerCase();
      list = list.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q)));
    } else if (view === 'favorites') list = list.filter(n => n.favorite);
    else if (view !== 'all') list = list.filter(n => n.folderId === view);
    return list;
  }, [notes, search, searching, view]);

  useEffect(() => {
    if (!listNotes.some(n => n.id === activeNoteId)) setActiveNoteId(listNotes[0]?.id ?? null);
  }, [listNotes, activeNoteId]);

  // load draft when active note changes
  useEffect(() => {
    if (!activeNote) return;
    setDraftTitle(activeNote.title);
    setDraftSubtitle(activeNote.subtitle ?? '');
    setDraftSession(activeNote.meta?.session ?? '');
    setDraftBlocks(ensureBlocks(activeNote));
    setSaveState('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNote?.id]);

  const scheduleSave = (patch: Partial<Note>) => {
    if (!activeNote) return;
    const id = activeNote.id;
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateNote(id, patch);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    }, 900);
  };
  const saveTitle = (v: string) => { setDraftTitle(v); scheduleSave({ title: v }); };
  const saveSubtitle = (v: string) => { setDraftSubtitle(v); scheduleSave({ subtitle: v }); };
  const saveSession = (v: string) => { setDraftSession(v); scheduleSave({ meta: { ...activeNote?.meta, session: v.trim() || undefined } }); };
  const saveBlocks = (b: Block[]) => { setDraftBlocks(b); scheduleSave({ blocks: b, meta: { ...activeNote?.meta, session: draftSession.trim() || undefined } }); };

  // ── collections dnd ──
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const onFolderDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = folders.map(f => f.id);
    reorderFolders(arrayMove(ids, ids.indexOf(active.id as string), ids.indexOf(over.id as string)));
  };

  const folderLimitReached = isAtFolderLimit(folders.length);
  const startCreateFolder = () => { if (folderLimitReached) return; setCreatingFolder(true); setNewFolderName(''); setNewFolderIcon('🗂️'); setNewFolderPicker(false); };
  const commitCreateFolder = () => {
    const name = newFolderName.trim();
    if (name) { const f = addFolder(name, newFolderIcon); setView(f.id); push({ kind: 'success', text: 'Colección creada' }); }
    setCreatingFolder(false); setNewFolderName(''); setNewFolderPicker(false);
  };
  const doDeleteFolder = () => {
    if (!confirmFolderId) return;
    deleteFolder(confirmFolderId);
    push({ kind: 'success', text: 'Colección eliminada' });
    setView('all');
    setConfirmFolderId(null);
  };

  // ── notes ──
  const targetFolderForNew = () => (typeof view === 'string' && view !== 'all' && view !== 'favorites') ? view : (folders[0]?.id ?? null);
  const onNewNote = (folderId?: string) => {
    const fid = folderId ?? targetFolderForNew();
    if (!fid) { push({ kind: 'error', text: 'Crea una colección primero' }); return; }
    const note = addNote(fid, '');
    checkFirstNoteMilestone(useNotebookStore.getState().notes.filter(n => n.userId === note.userId).length);
    setSearch(''); if (view === 'favorites') setView(fid);
    setActiveNoteId(note.id);
  };
  const doDeleteNote = () => { if (confirmNoteId) { deleteNote(confirmNoteId); push({ kind: 'success', text: 'Nota eliminada' }); setConfirmNoteId(null); } };
  const duplicateNote = () => {
    if (!activeNote) return;
    const copy = duplicateNoteStore(activeNote.id);
    if (copy) { setActiveNoteId(copy.id); push({ kind: 'success', text: 'Nota duplicada' }); }
    setNoteMenuOpen(false);
  };
  const moveNote = (folderId: string) => {
    if (!activeNote) return;
    moveNoteStore(activeNote.id, folderId);
    setView(folderId); setMovePickerOpen(false); setNoteMenuOpen(false);
    push({ kind: 'success', text: 'Nota movida' });
  };
  const exportMarkdown = () => {
    if (!activeNote) return;
    const md = `# ${draftTitle || 'Sin título'}\n\n${draftSubtitle ? draftSubtitle + '\n\n' : ''}${activeNote.content}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${(draftTitle || 'nota').replace(/[^\w-]+/g, '_')}.md`; a.click(); URL.revokeObjectURL(a.href);
    setNoteMenuOpen(false); push({ kind: 'success', text: 'Exportado como Markdown' });
  };

  // ── tags ──
  const allTags = useMemo(() => [...new Set(notes.flatMap(n => n.tags))], [notes]);
  const addTag = (raw: string) => {
    if (!activeNote) return;
    const tag = raw.trim().replace(/,$/, '');
    if (tag && !activeNote.tags.includes(tag)) updateNote(activeNote.id, { tags: [...activeNote.tags, tag] });
    setTagInput('');
  };
  const removeTag = (tag: string) => { if (activeNote) updateNote(activeNote.id, { tags: activeNote.tags.filter(t => t !== tag) }); };

  // ── block inserts ──
  const insertBlockToolbar = (type: Block['type'], level?: 2 | 3) => {
    const idx = draftBlocks.length;
    if (type === 'trade') { setTradePicker({ insertAfter: idx }); return; }
    if (type === 'image') { imageInsertRef.current = idx; imageFileRef.current?.click(); return; }
    const block = type === 'heading' ? newBlock('heading', { level: level ?? 2, text: '' })
      : type === 'checklist' ? newBlock('checklist', { items: [{ id: crypto.randomUUID(), text: '', checked: false }] })
      : newBlock(type, { text: '' });
    saveBlocks([...draftBlocks, block]);
    if (type !== 'divider') setFocusBlockId(block.id);
  };
  const onImageChosen = async (files: FileList | null) => {
    const idx = imageInsertRef.current; imageInsertRef.current = null;
    if (!files?.length || idx == null) return;
    try {
      const dataUrl = await processImageForUpload(files[0]);
      const next = [...draftBlocks]; next.splice(idx, 0, newBlock('image', { dataUrl, caption: '' })); saveBlocks(next);
    } catch (err) { push({ kind: 'error', text: err instanceof Error ? err.message : 'Error al procesar imagen' }); }
  };
  const onPickTradeAt = (tradeId: string) => {
    if (!tradePicker) return;
    const next = [...draftBlocks]; next.splice(tradePicker.insertAfter, 0, newBlock('trade', { tradeId })); saveBlocks(next);
    setTradePicker(null);
  };
  const openImageLightbox = (dataUrl: string) => {
    const imgs = draftBlocks.filter(b => b.type === 'image' && b.content.dataUrl).map(b => b.content.dataUrl!) as string[];
    const index = Math.max(0, imgs.indexOf(dataUrl));
    setLightbox({ images: imgs.length ? imgs : [dataUrl], index });
  };
  const openTradeDetail = (id: string) => { const t = trades.find(x => x.id === id); if (t) setDetailTrade(t); };

  // ── share (local PNG) ──
  const editorContentRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const generateShareImage = async (action: 'download' | 'copy') => {
    if (!editorContentRef.current) return;
    setSharing(true);
    try {
      const blob = await nodeToPngBlob(editorContentRef.current, { bg: C.bg, scale: 2 });
      if (action === 'download') {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${(draftTitle || 'nota').replace(/[^\w-]+/g, '_')}.png`; a.click(); URL.revokeObjectURL(a.href);
        push({ kind: 'success', text: 'Imagen descargada' });
      } else {
        try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); push({ kind: 'success', text: 'Imagen copiada' }); }
        catch { push({ kind: 'error', text: 'Copia no soportada; usa Descargar' }); }
      }
    } catch { push({ kind: 'error', text: 'No se pudo generar la imagen' }); }
    setSharing(false);
  };

  // ── command palette bridge ──
  useEffect(() => {
    const onNew = () => onNewNote();
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      const target = useNotebookStore.getState().notes.find(n => n.id === id);
      if (!target) return;
      setSearch(''); setView(target.folderId); setActiveNoteId(id);
    };
    window.addEventListener('trace:new-note', onNew);
    window.addEventListener('trace:open-note', onOpen as EventListener);
    return () => { window.removeEventListener('trace:new-note', onNew); window.removeEventListener('trace:open-note', onOpen as EventListener); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, folders]);

  // esc exits focus mode
  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !lightbox && !detailTrade) setFocusMode(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode, lightbox, detailTrade]);

  const allCount = notes.length;
  const favCount = notes.filter(n => n.favorite).length;
  const noteCount = (fid: string) => notes.filter(n => n.folderId === fid).length;
  const activeFolder = folders.find(f => f.id === view);
  const crumbName = view === 'all' ? 'Todas las notas' : view === 'favorites' ? 'Favoritas' : activeFolder?.name ?? '—';
  const tradesCount = draftBlocks.filter(b => b.type === 'trade').length;

  // ── editor body (shared between normal + focus mode) ──
  const editorInner = activeNote && (
    <>
      <div ref={editorContentRef}>
        {/* meta line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0 6px' }}>
          <span style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: C.muted, textTransform: 'uppercase' }}>
            {metaDate(activeNote.meta?.date ?? activeNote.date)}
          </span>
          <span style={{ color: '#33343c' }}>·</span>
          <EditableText
            value={draftSession} onChange={saveSession} placeholder="AÑADIR SESIÓN"
            style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: draftSession ? C.olive : '#4a4b54', textTransform: 'uppercase', minWidth: 60 }}
          />
          {tradesCount > 0 && <>
            <span style={{ color: '#33343c' }}>·</span>
            <span style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: C.muted, textTransform: 'uppercase' }}>{tradesCount} {tradesCount === 1 ? 'operación' : 'operaciones'}</span>
          </>}
        </div>

        {/* title */}
        <EditableText
          value={draftTitle} onChange={saveTitle} placeholder="Sin título"
          style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '3.2rem', color: C.text, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '8px 0 16px' }}
        />

        {/* subtitle */}
        <EditableText
          value={draftSubtitle} onChange={saveSubtitle} placeholder="Añade una breve descripción…" multiline
          style={{ fontSize: '1.1rem', color: C.olive, lineHeight: 1.6, margin: '0 0 24px' }}
        />

        {/* block insert toolbar */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 6, display: 'flex', gap: 4, marginBottom: 24 }}>
          {([
            { t: 'paragraph' as const, icon: '📝', label: 'Texto' },
            { t: 'checklist' as const, icon: '✅', label: 'Checklist' },
            { t: 'trade' as const, icon: '📈', label: 'Trade' },
            { t: 'image' as const, icon: '🖼', label: 'Imagen' },
          ]).map(b => (
            <button key={b.label} onClick={() => insertBlockToolbar(b.t)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, cursor: 'pointer', background: 'transparent', border: 'none', color: C.text2, fontFamily: fontBody, fontSize: '0.82rem', transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ fontSize: 15, opacity: 0.9 }}>{b.icon}</span>{b.label}
            </button>
          ))}
        </div>

        {/* blocks */}
        <BlockList
          blocks={draftBlocks} trades={trades} focusMode={focusMode}
          onChange={saveBlocks}
          onOpenTrade={openTradeDetail}
          onOpenImage={openImageLightbox}
          onPickTrade={i => setTradePicker({ insertAfter: i })}
          onPickImage={i => { imageInsertRef.current = i; imageFileRef.current?.click(); }}
          focusId={focusBlockId}
          onFocusHandled={() => setFocusBlockId(null)}
        />
      </div>

      {/* tags row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, borderTop: `1px solid ${C.border}`, padding: '20px 0', marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          <span style={{ fontSize: 14, opacity: 0.6 }}>🏷</span>
          {activeNote.tags.map(tag => (
            <button key={tag} onClick={() => removeTag(tag)} title="Quitar" style={{ background: 'rgba(255,255,255,0.04)', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: '0.75rem', color: C.olive, cursor: 'pointer', fontFamily: fontBody }}>{tag} ✕</button>
          ))}
          <input
            list="nb-tag-suggestions" value={tagInput}
            onChange={e => { const v = e.target.value; if (v.endsWith(',')) addTag(v); else setTagInput(v); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
            placeholder="Añadir etiqueta…"
            style={{ background: 'transparent', border: 'none', outline: 'none', color: C.text2, fontSize: '0.75rem', fontFamily: fontBody, minWidth: 120 }}
          />
          <datalist id="nb-tag-suggestions">{allTags.map(t => <option key={t} value={t} />)}</datalist>
        </div>
        <button
          onClick={() => setFocusMode(f => !f)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, borderRadius: 8, padding: '6px 12px', fontSize: '0.78rem', cursor: 'pointer', fontFamily: fontBody, whiteSpace: 'nowrap' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >⛶ {focusMode ? 'Salir de foco' : 'Modo foco'}</button>
      </div>
    </>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', height: '100%', minHeight: 0, overflow: 'hidden', background: C.bg }}
      onClick={() => { setCtxMenu(null); setNoteMenuOpen(false); }}>
      <style>{`
        .nb-block:hover .nb-block-gutter { opacity: 1 !important; }
        [contenteditable][data-empty="true"]:empty::before, [contenteditable][data-placeholder]:empty::before { content: attr(data-placeholder); color: #4a4b54; pointer-events: none; }
        .nb-row:hover .nb-row-more { opacity: 1 !important; }
      `}</style>

      {/* ── MIDDLE COLUMN ── */}
      <div style={{ background: C.bg, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => onNewNote()}
            style={{ width: '100%', background: C.blue, color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}
            onMouseEnter={e => (e.currentTarget.style.background = '#3d7aee')}
            onMouseLeave={e => (e.currentTarget.style.background = C.blue)}>＋ Nueva nota</button>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, opacity: 0.6 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en mis notas..."
              className="nb-search"
              style={{ width: '100%', boxSizing: 'border-box', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px 10px 40px', fontSize: '0.82rem', color: C.text, outline: 'none', fontFamily: fontBody }} />
          </div>
        </div>

        <div style={{ overflowY: 'auto', minHeight: 0, flex: 1, paddingBottom: 20 }}>
          {searching ? (
            <div style={{ padding: '4px 0' }}>
              <SectionLabel>Resultados</SectionLabel>
              {listNotes.length === 0 && (
                <div style={{ padding: '12px 20px', fontSize: '0.8rem', color: C.muted }}>
                  Ningún resultado para “{search}”
                  <button onClick={() => setSearch('')} style={{ display: 'block', marginTop: 6, background: 'transparent', border: 'none', color: C.blue, cursor: 'pointer', fontSize: '0.78rem', padding: 0, fontFamily: fontBody }}>Limpiar búsqueda</button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* VISTAS */}
              <SectionLabel>Vistas</SectionLabel>
              <ViewRow icon="📋" label="Todas las notas" count={allCount} active={view === 'all'} onClick={() => { setView('all'); setSearch(''); }} />
              <ViewRow icon="⭐" label="Favoritas" count={favCount} active={view === 'favorites'} onClick={() => { setView('favorites'); setSearch(''); }} />

              {/* COLECCIONES */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 4px' }}>
                <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600 }}>Colecciones</span>
                <button onClick={startCreateFolder} title="Nueva colección" style={{ width: 22, height: 22, borderRadius: 6, background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>＋</button>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onFolderDragEnd}>
                <SortableContext items={folders.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  {folders.map(f => (
                    <CollectionRow key={f.id} folder={f} active={view === f.id} count={noteCount(f.id)}
                      renaming={renamingId === f.id} renameValue={renameValue} setRenameValue={setRenameValue}
                      onRenameCommit={() => { updateFolder(f.id, { name: renameValue.trim() || f.name }); setRenamingId(null); push({ kind: 'success', text: 'Colección renombrada' }); }}
                      onRenameCancel={() => setRenamingId(null)}
                      onSelect={() => { setView(f.id); setSearch(''); }}
                      onMore={r => setCtxMenu({ folderId: f.id, x: Math.min(r.left, window.innerWidth - 190), y: r.bottom + 4 })}
                      onContextMenu={(x, y) => setCtxMenu({ folderId: f.id, x, y })}
                      iconPickerOpen={iconPickerId === f.id} onIconSelect={em => updateFolder(f.id, { icon: em })} onIconClose={() => setIconPickerId(null)} />
                  ))}
                </SortableContext>
              </DndContext>

              {creatingFolder && (
                <div style={{ margin: '8px 16px 0', display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
                  <button onClick={() => setNewFolderPicker(v => !v)} style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 6, background: C.card, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 15 }}>{newFolderIcon}</button>
                  <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitCreateFolder(); if (e.key === 'Escape') setCreatingFolder(false); }}
                    placeholder="Nombre…" style={{ flex: 1, minWidth: 0, background: C.card, border: `1px solid ${C.blue}`, borderRadius: 7, padding: '8px 10px', fontSize: '0.78rem', color: C.text, outline: 'none', fontFamily: fontBody }} />
                  <button onClick={commitCreateFolder} style={{ flexShrink: 0, background: C.blue, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 10px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}>Crear</button>
                  {newFolderPicker && <EmojiPicker onSelect={em => { setNewFolderIcon(em); setNewFolderPicker(false); }} onClose={() => setNewFolderPicker(false)} />}
                </div>
              )}
              {folderLimitReached && isFree && !creatingFolder && (
                <div style={{ margin: '10px 16px', background: 'rgba(79,143,255,0.06)', border: '1px solid rgba(79,143,255,0.12)', borderRadius: 8, padding: 10, fontSize: '0.72rem', color: C.text2 }}>
                  Límite de colecciones del plan Gratis
                  <button onClick={() => openUpgrade()} style={{ display: 'block', background: 'transparent', border: 'none', color: C.blue, cursor: 'pointer', padding: '4px 0 0', fontSize: '0.72rem', fontWeight: 600 }}>Ver Plan Pro →</button>
                </div>
              )}
            </>
          )}

          {/* NOTES LIST of active view */}
          <div style={{ marginTop: 10 }}>
            {listNotes.map(n => {
              const active = n.id === activeNoteId;
              return (
                <button key={n.id} onClick={() => setActiveNoteId(n.id)}
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'block',
                    background: active ? 'rgba(79,143,255,0.06)' : 'transparent',
                    borderTop: `1px solid #14161b`, borderLeft: active ? `3px solid ${C.blue}` : '3px solid transparent',
                    borderRight: 'none', borderBottom: 'none', padding: active ? '14px 20px 14px 17px' : '14px 20px', fontFamily: fontBody }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {n.favorite && <span style={{ color: C.blue, fontSize: 11 }}>★</span>}{n.title || 'Sin título'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: C.muted, lineHeight: 1.5, marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {preview(n.content) || 'Sin contenido'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 }}>
                    <div style={{ display: 'flex', gap: 5, minWidth: 0 }}>
                      {n.tags.slice(0, 2).map(t => <span key={t} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 5, padding: '3px 8px', fontSize: '0.65rem', color: C.olive, whiteSpace: 'nowrap' }}>{t}</span>)}
                      {n.tags.length > 2 && <span style={{ fontSize: '0.65rem', color: C.muted, alignSelf: 'center' }}>+{n.tags.length - 2}</span>}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: C.muted, whiteSpace: 'nowrap', flexShrink: 0 }}>{shortDate(n.updatedAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── EDITOR COLUMN ── */}
      <div style={{ background: C.bg, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {!activeNote ? (
          <EmptyEditor view={view} crumbName={crumbName} onNew={() => onNewNote()} />
        ) : (
          <>
            {/* top actions bar */}
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '20px 48px 16px' }}>
              <div style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <button onClick={() => { setView('all'); }} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '0.78rem', fontFamily: fontBody, padding: 0 }}>Notebook</button>
                <span style={{ color: '#33343c' }}>/</span>
                <span style={{ color: C.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{crumbName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                {saveState !== 'idle' && <span style={{ fontSize: 11, color: saveState === 'saving' ? C.muted : C.blue, marginRight: 2 }}>{saveState === 'saving' ? 'Guardando…' : 'Guardado ✓'}</span>}
                <button onClick={() => setShareOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, borderRadius: 8, padding: '6px 12px', fontSize: '0.78rem', cursor: 'pointer', fontFamily: fontBody }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>👥 Compartir</button>
                <IconBtn onClick={() => toggleFavorite(activeNote.id)} active={!!activeNote.favorite} title="Favorito">{activeNote.favorite ? '★' : '☆'}</IconBtn>
                <IconBtn onClick={e => { e.stopPropagation(); setNoteMenuOpen(o => !o); setMovePickerOpen(false); }} title="Más">⋯</IconBtn>
                {noteMenuOpen && (
                  <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 40, right: 0, zIndex: 40, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, minWidth: 210, boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
                    <MenuRow onClick={duplicateNote}>Duplicar</MenuRow>
                    <MenuRow onClick={() => setMovePickerOpen(v => !v)}>Mover a colección ▸</MenuRow>
                    {movePickerOpen && (
                      <div style={{ maxHeight: 180, overflowY: 'auto', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, margin: '4px 0' }}>
                        {folders.filter(f => f.id !== activeNote.folderId).map(f => <MenuRow key={f.id} onClick={() => moveNote(f.id)}>{f.icon} {f.name}</MenuRow>)}
                      </div>
                    )}
                    <MenuRow onClick={exportMarkdown}>Exportar como Markdown</MenuRow>
                    <div style={{ height: 1, background: C.border, margin: '4px 0' }} />
                    <MenuRow danger onClick={() => { setNoteMenuOpen(false); setConfirmNoteId(activeNote.id); }}>Eliminar</MenuRow>
                  </div>
                )}
              </div>
            </div>

            {/* scrollable editor */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 48px 48px' }}>{editorInner}</div>
            </div>
          </>
        )}
      </div>

      {/* ── FOCUS MODE overlay ── */}
      {focusMode && activeNote && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: C.bg, overflowY: 'auto' }}>
          <button onClick={() => setFocusMode(false)} style={{ position: 'fixed', top: 20, right: 24, zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: 6, background: C.card, border: `1px solid ${C.border}`, color: C.text2, borderRadius: 8, padding: '8px 14px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: fontBody }}>✕ Salir de foco</button>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '72px 24px 64px' }}>{editorInner}</div>
        </div>
      )}

      {/* collection context menu */}
      {ctxMenu && (() => {
        const f = folders.find(x => x.id === ctxMenu.folderId); if (!f) return null;
        const prot = isProtected(f);
        return (
          <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 60, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, minWidth: 180, boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
            <MenuRow onClick={() => { setRenamingId(f.id); setRenameValue(f.name); setCtxMenu(null); }}>Renombrar</MenuRow>
            <MenuRow onClick={() => { setIconPickerId(f.id); setView(f.id); setCtxMenu(null); }}>Cambiar icono</MenuRow>
            {!prot && <MenuRow danger onClick={() => { setConfirmFolderId(f.id); setCtxMenu(null); }}>Eliminar</MenuRow>}
          </div>
        );
      })()}

      {/* trade picker */}
      {tradePicker && (
        <TradePicker trades={trades} onPick={onPickTradeAt} onClose={() => setTradePicker(null)} />
      )}

      {/* share modal */}
      {shareOpen && (
        <div onClick={() => setShareOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, width: '100%', maxWidth: 400, padding: 26, fontFamily: fontBody, textAlign: 'center' }}>
            <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.1rem', color: C.text }}>Compartir nota</div>
            <div style={{ fontSize: '0.82rem', color: C.muted, margin: '8px 0 20px', lineHeight: 1.5 }}>Genera una imagen de tu nota para compartirla. El enlace público llegará con Supabase próximamente.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button disabled={sharing} onClick={() => generateShareImage('copy')} style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, borderRadius: 9, padding: 11, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}>Copiar imagen</button>
              <button disabled={sharing} onClick={() => generateShareImage('download')} style={{ flex: 1.3, background: C.blue, color: '#fff', border: 'none', borderRadius: 9, padding: 11, fontSize: '0.82rem', fontWeight: 600, cursor: sharing ? 'default' : 'pointer', fontFamily: fontBody, opacity: sharing ? 0.7 : 1 }}>{sharing ? 'Generando…' : 'Descargar imagen'}</button>
            </div>
          </div>
        </div>
      )}

      {lightbox && <ImageLightbox images={lightbox.images} initialIndex={lightbox.index} isOpen onClose={() => setLightbox(null)} caption={draftTitle} />}
      {detailTrade && <TradeDetailModal trade={detailTrade} onClose={() => setDetailTrade(null)} />}

      <input ref={imageFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { onImageChosen(e.target.files); e.target.value = ''; }} />

      <ConfirmDialog open={!!confirmFolderId} title="¿Eliminar colección?"
        description={confirmFolderId ? `Se eliminará “${folders.find(f => f.id === confirmFolderId)?.name ?? ''}”. Sus ${noteCount(confirmFolderId)} notas se moverán a otra colección.` : ''}
        confirmText="Eliminar" destructive onConfirm={doDeleteFolder} onCancel={() => setConfirmFolderId(null)} />
      <ConfirmDialog open={!!confirmNoteId} title="¿Eliminar esta nota?" description="Esta acción no se puede deshacer."
        confirmText="Eliminar" destructive onConfirm={doDeleteNote} onCancel={() => setConfirmNoteId(null)} />
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, padding: '10px 20px 4px' }}>{children}</div>;
}

function ViewRow({ icon, label, count, active, onClick }: { icon: string; label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px', cursor: 'pointer', background: active ? 'rgba(79,143,255,0.08)' : 'transparent', border: 'none', color: active ? C.blue : C.text2, fontSize: '0.85rem', fontFamily: fontBody, textAlign: 'left' }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ fontSize: '0.7rem', color: C.muted }}>{count}</span>
    </button>
  );
}

interface CollectionRowProps {
  folder: Folder; active: boolean; count: number;
  renaming: boolean; renameValue: string; setRenameValue: (v: string) => void;
  onRenameCommit: () => void; onRenameCancel: () => void;
  onSelect: () => void; onMore: (r: DOMRect) => void; onContextMenu: (x: number, y: number) => void;
  iconPickerOpen: boolean; onIconSelect: (em: string) => void; onIconClose: () => void;
}
function CollectionRow(p: CollectionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.folder.id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, position: 'relative', zIndex: isDragging ? 5 : undefined };
  if (p.renaming) {
    return (
      <div ref={setNodeRef} style={style}>
        <input autoFocus value={p.renameValue} onChange={e => p.setRenameValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') p.onRenameCommit(); if (e.key === 'Escape') p.onRenameCancel(); }} onBlur={p.onRenameCancel}
          style={{ width: 'calc(100% - 32px)', margin: '2px 16px', boxSizing: 'border-box', background: C.card, border: `1px solid ${C.blue}`, borderRadius: 7, padding: '7px 10px', fontSize: '0.82rem', color: C.text, outline: 'none', fontFamily: fontBody }} />
      </div>
    );
  }
  const a = p.active;
  return (
    <div ref={setNodeRef} style={style} className="nb-row">
      <span {...attributes} {...listeners} title="Reordenar" style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', color: C.muted, cursor: 'grab', fontSize: 10, touchAction: 'none', opacity: 0.35, letterSpacing: '-2px' }}>⋮⋮</span>
      <button onClick={p.onSelect} onContextMenu={e => { e.preventDefault(); p.onContextMenu(e.clientX, e.clientY); }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px', cursor: 'pointer', textAlign: 'left', fontFamily: fontBody, fontSize: '0.85rem',
          background: a ? 'rgba(79,143,255,0.08)' : 'transparent', color: a ? C.blue : C.text2, border: 'none', borderLeft: a ? `2px solid ${C.blue}` : '2px solid transparent' }}
        onMouseEnter={e => { if (!a) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        onMouseLeave={e => { if (!a) e.currentTarget.style.background = 'transparent'; }}>
        <span style={{ fontSize: 17 }}>{p.folder.icon}</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.folder.name}</span>
        <span style={{ fontSize: '0.7rem', color: C.muted }}>{p.count}</span>
      </button>
      <button className="nb-row-more" aria-label="Opciones" onClick={e => { e.stopPropagation(); p.onMore(e.currentTarget.getBoundingClientRect()); }}
        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, borderRadius: 5, background: C.card, border: `1px solid ${C.border}`, color: C.text2, cursor: 'pointer', fontSize: 12, lineHeight: 1, opacity: 0, transition: 'opacity 0.12s' }}>⋯</button>
      {p.iconPickerOpen && <EmojiPicker onSelect={p.onIconSelect} onClose={p.onIconClose} />}
    </div>
  );
}

function EmptyEditor({ view, crumbName, onNew }: { view: View; crumbName: string; onNew: () => void }) {
  const collectionEmpty = view !== 'all' && view !== 'favorites';
  return (
    <div style={{ margin: 'auto', textAlign: 'center', padding: 60, maxWidth: 420 }}>
      <div style={{ fontSize: 44, marginBottom: 14, opacity: 0.5 }}>📓</div>
      <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.3rem', color: C.text, marginBottom: 8 }}>
        {view === 'favorites' ? 'Sin notas favoritas' : collectionEmpty ? `Aún no tienes notas en ${crumbName}` : 'Empieza a escribir tu diario de trading'}
      </div>
      <div style={{ fontSize: '0.88rem', color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>
        {view === 'favorites' ? 'Marca notas con ★ para verlas aquí.' : 'Crea tu primera nota con /, escribe libremente o inserta tus operaciones.'}
      </div>
      <button onClick={onNew} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}>＋ Nueva nota</button>
    </div>
  );
}

function TradePicker({ trades, onPick, onClose }: { trades: Trade[]; onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const filtered = trades.filter(t => `${t.asset} ${t.setup} ${t.date}`.toLowerCase().includes(q.toLowerCase())).slice(0, 40);
  const fmt = (n: number) => `${n >= 0 ? '+' : '-'}$${Math.abs(n).toFixed(0)}`;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, width: '100%', maxWidth: 460, maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: fontBody }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.95rem', color: C.text, marginBottom: 10 }}>Insertar operación</div>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por activo, setup, fecha…" style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontSize: '0.82rem', color: C.text, outline: 'none', fontFamily: fontBody }} />
        </div>
        <div style={{ overflowY: 'auto' }}>
          {filtered.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: '0.82rem' }}>No hay operaciones</div>}
          {filtered.map(t => (
            <button key={t.id} onClick={() => onPick(t.id)} style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '11px 16px', background: 'transparent', border: 'none', borderTop: `1px solid #14161b`, cursor: 'pointer', fontFamily: fontBody }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ fontSize: '0.85rem', color: C.text }}>{t.asset} <span style={{ color: t.direction === 'long' ? C.blue : C.red, fontSize: '0.72rem' }}>{t.direction.toUpperCase()}</span></span>
              <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: C.muted }}>{t.date}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: t.pnl >= 0 ? C.blue : C.red }}>{fmt(t.pnl)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, active, title }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void; active?: boolean; title?: string }) {
  return <button onClick={onClick} title={title} style={{ width: 36, height: 36, borderRadius: 8, background: active ? 'rgba(79,143,255,0.12)' : 'transparent', border: `1px solid ${C.border}`, color: active ? C.blue : C.text2, cursor: 'pointer', fontSize: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>{children}</button>;
}
function MenuRow({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: danger ? C.red : C.text2, padding: '8px 10px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: 6, fontFamily: fontBody }}
    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{children}</button>;
}

export default Notebook;

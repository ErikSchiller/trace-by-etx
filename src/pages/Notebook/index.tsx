import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Search, Plus, Star, Maximize2, Share2, MoreHorizontal,
  Type, CheckSquare, TrendingUp, Image as ImageIcon, LayoutGrid, GripVertical, BookOpen,
  ImagePlus, List, ListOrdered, Quote as QuoteIcon,
} from 'lucide-react';
import {
  useNotebookStore, useUserFolders, useUserNotes,
  DEFAULT_FOLDER_NAMES, ensureBlocks, newBlock,
  type Folder, type Note, type Block, type NoteCover, type Attachment,
} from '../../store/notebookStore';
import { useGoalsStore } from '../../store/goalsStore';
import { CoverBar, CoverImagePicker } from '../../components/Notebook/CoverImagePicker';
import { NoteSidebar } from '../../components/Notebook/NoteSidebar';
import { TemplatePicker, type CreateFields } from '../../components/Notebook/TemplatePicker';
import { useUserTrades, type Trade } from '../../store/tradeStore';
import { useToast } from '../../components/UI/ToastProvider';
import { usePlan } from '../../hooks/usePlan';
import { useUpgradeModal } from '../../store/upgradeModalStore';
import { ConfirmDialog } from '../../components/UI/ConfirmDialog';
import { ImageLightbox } from '../../components/UI/ImageLightbox';
import { TradeDetailModal } from '../../components/Modals/TradeDetailModal';
import { checkFirstNoteMilestone } from '../../utils/milestones';
import { processImageForUpload } from '../../utils/imageProcessing';
import { nodeToPngBlob } from '../../utils/domImage';
import { BlockList, EditableText } from './NotebookBlocks';
import { NotebookIcon, IconPicker } from './icons';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const C = {
  bg: '#0a0a0c', mid: '#0d0d0f', card: '#151519', card2: '#131418',
  borderSubtle: '#16181d', border: '#1e2029', borderEl: '#2a2c33',
  blue: '#4f8fff', red: '#ef4444',
  text: '#f7f8fa', text2: '#d0d0dc', text3: '#8a8a99', muted: '#6b7280', faint: '#4a4a60',
  olive: '#a1ab88',
};

function isProtected(f: Folder) { return !!f.system || !!f.isDefault || DEFAULT_FOLDER_NAMES.includes(f.name); }
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function metaDate(iso: string) { const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()].toUpperCase()} ${d.getFullYear()}`; }
function smartDate(iso: string) {
  const d = new Date(iso); const now = new Date();
  if (d.toDateString() === now.toDateString()) return `Hoy ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Ayer';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
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
  const seedGoals = useGoalsStore(s => s.seedTemplatesIfEmpty);

  useEffect(() => { ensureDefaults(); seedGoals(); }, [ensureDefaults, seedGoals]);

  const [view, setView] = useState<View>('all');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [focusMode, setFocusMode] = useState(false);

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('Folder');
  const [newFolderPicker, setNewFolderPicker] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ folderId: string; x: number; y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [iconPickerId, setIconPickerId] = useState<string | null>(null);
  const [confirmFolderId, setConfirmFolderId] = useState<string | null>(null);

  const [noteMenuOpen, setNoteMenuOpen] = useState(false);
  const [movePickerOpen, setMovePickerOpen] = useState(false);
  const [confirmNoteId, setConfirmNoteId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const [tradePicker, setTradePicker] = useState<{ insertAfter: number } | null>(null);
  const imageInsertRef = useRef<number | null>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [detailTrade, setDetailTrade] = useState<Trade | null>(null);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const saveAsTemplate = useNotebookStore(s => s.saveAsTemplate);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftSubtitle, setDraftSubtitle] = useState('');
  const [draftSession, setDraftSession] = useState('');
  const [draftBlocks, setDraftBlocks] = useState<Block[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId) || null, [notes, activeNoteId]);

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const onFolderDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = folders.map(f => f.id);
    reorderFolders(arrayMove(ids, ids.indexOf(active.id as string), ids.indexOf(over.id as string)));
  };

  const folderLimitReached = isAtFolderLimit(folders.length);
  const startCreateFolder = () => { if (folderLimitReached) return; setCreatingFolder(true); setNewFolderName(''); setNewFolderIcon('Folder'); setNewFolderPicker(false); };
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

  const targetFolderForNew = () => (typeof view === 'string' && view !== 'all' && view !== 'favorites') ? view : (folders[0]?.id ?? null);
  const onNewNote = (folderId?: string) => {
    const fid = folderId ?? targetFolderForNew();
    if (!fid) { push({ kind: 'error', text: 'Crea una colección primero' }); return; }
    const note = addNote(fid, '');
    checkFirstNoteMilestone(useNotebookStore.getState().notes.filter(n => n.userId === note.userId).length);
    setSearch(''); if (view === 'favorites') setView(fid);
    setActiveNoteId(note.id);
  };
  const createFromTemplate = (fields: CreateFields) => {
    const fid = targetFolderForNew();
    if (!fid) { push({ kind: 'error', text: 'Crea una colección primero' }); return; }
    const note = addNote(fid, fields.title || 'Sin título');
    updateNote(note.id, { title: fields.title, blocks: fields.blocks, cover: fields.cover, properties: fields.properties, tags: fields.tags });
    checkFirstNoteMilestone(useNotebookStore.getState().notes.filter(n => n.userId === note.userId).length);
    setSearch(''); if (view === 'favorites') setView(fid);
    setActiveNoteId(note.id);
    setTemplatePickerOpen(false);
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

  const allTags = useMemo(() => [...new Set(notes.flatMap(n => n.tags))], [notes]);
  const addTag = (raw: string) => {
    if (!activeNote) return;
    const tag = raw.trim().replace(/,$/, '');
    if (tag && !activeNote.tags.includes(tag)) updateNote(activeNote.id, { tags: [...activeNote.tags, tag] });
    setTagInput('');
  };
  const removeTag = (tag: string) => { if (activeNote) updateNote(activeNote.id, { tags: activeNote.tags.filter(t => t !== tag) }); };

  const insertBlockToolbar = (type: Block['type'], level?: 1 | 2 | 3) => {
    const idx = draftBlocks.length;
    if (type === 'trade') { setTradePicker({ insertAfter: idx }); return; }
    if (type === 'image') { imageInsertRef.current = idx; imageFileRef.current?.click(); return; }
    const block = type === 'heading' ? newBlock('heading', { level: level ?? 2, text: '' })
      : type === 'checklist' ? newBlock('checklist', { items: [{ id: crypto.randomUUID(), text: '', checked: false }] })
      : (type === 'bulleted_list' || type === 'numbered_list') ? newBlock(type, { listItems: [{ id: crypto.randomUUID(), text: '' }] })
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

  // ── Cover handlers ──
  const setCover = (cover: NoteCover) => { if (activeNote) updateNote(activeNote.id, { cover }); setCoverPickerOpen(false); };
  const removeCover = () => { if (activeNote) updateNote(activeNote.id, { cover: undefined }); };
  const repositionCover = (position: number) => { if (activeNote?.cover) updateNote(activeNote.id, { cover: { ...activeNote.cover, position } }); };
  const recentCovers = useMemo(
    () => [...new Set(notes.map(n => n.cover).filter((c): c is NoteCover => !!c && c.type === 'image' && !!c.url).map(c => c.url!))],
    [notes],
  );
  const openAttachment = (att: Attachment) => {
    if (att.type === 'image') { setLightbox({ images: [att.url], index: 0 }); return; }
    const a = document.createElement('a'); a.href = att.url; a.download = att.name; a.click();
  };

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

  const editorInner = activeNote && (
    <>
      <div ref={editorContentRef}>
        {/* meta line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 8px' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.12em', color: C.muted, textTransform: 'uppercase' }}>
            {metaDate(activeNote.meta?.date ?? activeNote.date)}
          </span>
          <span style={{ color: C.faint }}>·</span>
          <EditableText
            value={draftSession} onChange={saveSession} placeholder="AÑADIR SESIÓN"
            style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.12em', color: draftSession ? C.olive : C.faint, textTransform: 'uppercase', minWidth: 60 }}
          />
          {tradesCount > 0 && <>
            <span style={{ color: C.faint }}>·</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.12em', color: C.muted, textTransform: 'uppercase' }}>{tradesCount} {tradesCount === 1 ? 'operación' : 'operaciones'}</span>
          </>}
        </div>

        {/* title */}
        <EditableText
          value={draftTitle} onChange={saveTitle} placeholder="Sin título"
          className="nb-title"
          style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2.4rem', color: C.text, letterSpacing: '-0.02em', lineHeight: 1.12, margin: '8px 0 12px', paddingBottom: 2, borderBottom: '2px solid transparent' }}
        />

        {/* subtitle */}
        <EditableText
          value={draftSubtitle} onChange={saveSubtitle} placeholder="Añade una breve descripción…" multiline
          style={{ fontSize: '1.1rem', color: C.olive, lineHeight: 1.6, margin: '0 0 16px' }}
        />

        {/* collection + tags chip row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', margin: '0 0 24px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(79,143,255,0.1)', color: C.blue, borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600 }}>
            <NotebookIcon name={activeFolder?.icon ?? 'Folder'} size={12} color={C.blue} />{crumbName}
          </span>
          {activeNote.tags.map(tag => (
            <button key={tag} onClick={() => removeTag(tag)} title="Quitar" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 500, color: C.olive, cursor: 'pointer', fontFamily: fontBody }}>{tag} ✕</button>
          ))}
          <input
            list="nb-tag-suggestions" value={tagInput}
            onChange={e => { const v = e.target.value; if (v.endsWith(',')) addTag(v); else setTagInput(v); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
            placeholder="+ etiqueta"
            style={{ background: 'transparent', border: 'none', outline: 'none', color: C.text2, fontSize: '0.72rem', fontFamily: fontBody, minWidth: 80 }}
          />
          <datalist id="nb-tag-suggestions">{allTags.map(t => <option key={t} value={t} />)}</datalist>
        </div>

        {/* block insert toolbar */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, display: 'flex', gap: 0, marginBottom: 24 }}>
          {([
            { t: 'paragraph' as const, Icon: Type, label: 'Texto' },
            { t: 'bulleted_list' as const, Icon: List, label: 'Lista' },
            { t: 'numbered_list' as const, Icon: ListOrdered, label: 'Numerada' },
            { t: 'checklist' as const, Icon: CheckSquare, label: 'Checklist' },
            { t: 'quote' as const, Icon: QuoteIcon, label: 'Cita' },
            { t: 'trade' as const, Icon: TrendingUp, label: 'Trade' },
            { t: 'image' as const, Icon: ImageIcon, label: 'Imagen' },
          ]).map(b => (
            <button key={b.label} onClick={() => insertBlockToolbar(b.t)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 8px', borderRadius: 8, cursor: 'pointer', background: 'transparent', border: 'none', color: C.olive, fontFamily: fontBody, fontSize: '0.8rem', whiteSpace: 'nowrap', transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = C.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.olive; }}>
              <b.Icon size={16} />{b.label}
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

      {/* bottom row — focus toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: `1px solid ${C.border}`, padding: '18px 0', marginTop: 24 }}>
        <button
          onClick={() => setFocusMode(f => !f)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, borderRadius: 8, padding: '6px 12px', fontSize: '0.78rem', cursor: 'pointer', fontFamily: fontBody, whiteSpace: 'nowrap' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        ><Maximize2 size={14} /> {focusMode ? 'Salir de foco' : 'Modo foco'}</button>
      </div>
    </>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', height: '100%', minHeight: 0, overflow: 'hidden', background: C.bg }}
      onClick={() => { setCtxMenu(null); setNoteMenuOpen(false); }}>
      <style>{`
        .nb-block:hover .nb-block-gutter { opacity: 1 !important; }
        [contenteditable][data-placeholder]:empty::before { content: attr(data-placeholder); color: ${C.faint}; pointer-events: none; }
        .nb-title[contenteditable]:empty::before { font-style: italic; }
        .nb-title[contenteditable]:focus { border-bottom-color: ${C.blue} !important; }
        .nb-row:hover .nb-row-more { opacity: 1 !important; }
        .nb-row:hover .nb-row-grip { opacity: 0.5 !important; }
        @media (max-width: 1100px) {
          .nb-editor-grid { grid-template-columns: 1fr !important; }
          .nb-sidebar { order: -1; }
        }
      `}</style>

      {/* ── MIDDLE COLUMN ── */}
      <div style={{ background: C.mid, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => setTemplatePickerOpen(true)}
            style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.blue, color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}
            onMouseEnter={e => (e.currentTarget.style.background = '#3d7aee')}
            onMouseLeave={e => (e.currentTarget.style.background = C.blue)}><Plus size={16} /> Nueva nota</button>
          <div style={{ position: 'relative' }}>
            <Search size={16} color={C.muted} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
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
              <ViewRow Icon={LayoutGrid} label="Todas las notas" count={allCount} active={view === 'all'} onClick={() => { setView('all'); setSearch(''); }} />
              <ViewRow Icon={Star} label="Favoritas" count={favCount} active={view === 'favorites'} onClick={() => { setView('favorites'); setSearch(''); }} />

              {/* COLECCIONES */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 6px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.muted, fontFamily: fontBody }}>Colecciones</span>
                <button onClick={startCreateFolder} title="Nueva colección" style={{ width: 20, height: 20, borderRadius: 5, background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = C.text; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.muted; }}><Plus size={15} /></button>
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
                  <button onClick={() => setNewFolderPicker(v => !v)} style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 7, background: C.card, border: `1px solid ${C.border}`, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><NotebookIcon name={newFolderIcon} size={16} color={C.olive} /></button>
                  <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitCreateFolder(); if (e.key === 'Escape') setCreatingFolder(false); }}
                    placeholder="Nombre…" style={{ flex: 1, minWidth: 0, background: C.card, border: `1px solid ${C.blue}`, borderRadius: 7, padding: '8px 10px', fontSize: '0.78rem', color: C.text, outline: 'none', fontFamily: fontBody }} />
                  <button onClick={commitCreateFolder} style={{ flexShrink: 0, background: C.blue, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 10px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}>Crear</button>
                  {newFolderPicker && <IconPicker current={newFolderIcon} onSelect={name => setNewFolderIcon(name)} onClose={() => setNewFolderPicker(false)} />}
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
            {!searching && listNotes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: C.muted }}>
                <BookOpen size={26} color={C.faint} style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: '0.82rem', color: C.text3 }}>Sin notas en {crumbName}</div>
                <button onClick={() => onNewNote()} style={{ marginTop: 8, background: 'transparent', border: 'none', color: C.blue, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: fontBody }}>Crea la primera →</button>
              </div>
            ) : listNotes.map(n => {
              const active = n.id === activeNoteId;
              const [main, ...rest] = (n.title || 'Sin título').split(' — ');
              return (
                <button key={n.id} onClick={() => setActiveNoteId(n.id)}
                  className="nb-note-card"
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'block',
                    background: active ? 'rgba(79,143,255,0.05)' : 'transparent',
                    borderTop: `1px solid ${C.borderSubtle}`, borderLeft: active ? `3px solid ${C.blue}` : '3px solid transparent',
                    borderRight: 'none', borderBottom: 'none', padding: active ? '14px 20px 14px 17px' : '14px 20px', fontFamily: fontBody, transition: 'background 0.12s' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: active ? C.text : '#e8e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {n.favorite && <Star size={11} color={C.blue} fill={C.blue} style={{ flexShrink: 0 }} />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{main}{rest.length > 0 && <span style={{ color: C.muted, fontWeight: 400, fontSize: '0.75rem' }}> — {rest.join(' — ')}</span>}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: C.olive, lineHeight: 1.55, marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {preview(n.content) || 'Sin contenido'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8 }}>
                    <div style={{ display: 'flex', gap: 5, minWidth: 0 }}>
                      {n.tags.slice(0, 2).map(t => <span key={t} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 5, padding: '3px 8px', fontSize: '0.66rem', letterSpacing: '0.02em', color: C.olive, whiteSpace: 'nowrap' }}>{t}</span>)}
                      {n.tags.length > 2 && <span style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 5, padding: '3px 8px', fontSize: '0.66rem', color: C.muted }}>+{n.tags.length - 2}</span>}
                    </div>
                    <span style={{ fontSize: '0.66rem', color: C.muted, whiteSpace: 'nowrap', flexShrink: 0 }}>{smartDate(n.updatedAt)}</span>
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
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '20px 56px 16px' }}>
              <div style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <button onClick={() => { setView('all'); }} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '0.78rem', fontFamily: fontBody, padding: 0 }}>Notebook</button>
                <span style={{ color: C.faint }}>/</span>
                <span style={{ color: C.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{crumbName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                {saveState !== 'idle' && <span style={{ fontSize: 11, color: saveState === 'saving' ? C.muted : C.blue, marginRight: 2 }}>{saveState === 'saving' ? 'Guardando…' : 'Guardado ✓'}</span>}
                {!activeNote.cover && (
                  <button onClick={() => setCoverPickerOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, borderRadius: 8, padding: '6px 12px', fontSize: '0.78rem', cursor: 'pointer', fontFamily: fontBody }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}><ImagePlus size={14} /> Añadir portada</button>
                )}
                <button onClick={() => setShareOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, borderRadius: 8, padding: '6px 12px', fontSize: '0.78rem', cursor: 'pointer', fontFamily: fontBody }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}><Share2 size={14} /> Compartir</button>
                <IconBtn onClick={() => toggleFavorite(activeNote.id)} active={!!activeNote.favorite} title="Favorito"><Star size={16} fill={activeNote.favorite ? C.blue : 'none'} /></IconBtn>
                <IconBtn onClick={e => { e.stopPropagation(); setNoteMenuOpen(o => !o); setMovePickerOpen(false); }} title="Más"><MoreHorizontal size={16} /></IconBtn>
                {noteMenuOpen && (
                  <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 40, right: 0, zIndex: 40, background: C.card, border: `1px solid ${C.borderEl}`, borderRadius: 10, padding: 4, minWidth: 210, boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
                    <MenuRow onClick={duplicateNote}>Duplicar</MenuRow>
                    <MenuRow onClick={() => setMovePickerOpen(v => !v)}>Mover a colección ▸</MenuRow>
                    {movePickerOpen && (
                      <div style={{ maxHeight: 180, overflowY: 'auto', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, margin: '4px 0' }}>
                        {folders.filter(f => f.id !== activeNote.folderId).map(f => <MenuRow key={f.id} onClick={() => moveNote(f.id)}><NotebookIcon name={f.icon} size={14} color={C.muted} /> {f.name}</MenuRow>)}
                      </div>
                    )}
                    <MenuRow onClick={() => { saveAsTemplate(activeNote.id); setNoteMenuOpen(false); push({ kind: 'success', text: 'Guardada en Mis plantillas' }); }}>Convertir en plantilla</MenuRow>
                    <MenuRow onClick={exportMarkdown}>Exportar como Markdown</MenuRow>
                    <div style={{ height: 1, background: C.border, margin: '4px 0' }} />
                    <MenuRow danger onClick={() => { setNoteMenuOpen(false); setConfirmNoteId(activeNote.id); }}>Eliminar</MenuRow>
                  </div>
                )}
              </div>
            </div>

            {/* scrollable editor: cover + content | sidebar */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {activeNote.cover && (
                <CoverBar cover={activeNote.cover} onReposition={repositionCover} onChange={() => setCoverPickerOpen(true)} onRemove={removeCover} />
              )}
              <div className="nb-editor-grid" style={{ maxWidth: 1180, margin: '0 auto', padding: activeNote.cover ? '24px 56px 56px' : '0 56px 56px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 40, alignItems: 'start' }}>
                <div style={{ minWidth: 0 }}>{editorInner}</div>
                <div className="nb-sidebar">
                  <NoteSidebar
                    note={activeNote} folders={folders}
                    onUpdate={patch => updateNote(activeNote.id, patch)}
                    onMove={fid => { moveNoteStore(activeNote.id, fid); if (view !== 'all' && view !== 'favorites') setView(fid); }}
                    onOpenAttachment={openAttachment}
                    onToast={(kind, text) => push({ kind, text })}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── FOCUS MODE overlay ── */}
      {focusMode && activeNote && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: C.bg, overflowY: 'auto' }}>
          <button onClick={() => setFocusMode(false)} style={{ position: 'fixed', top: 20, right: 24, zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: 7, background: C.card, border: `1px solid ${C.border}`, color: C.text2, borderRadius: 8, padding: '8px 14px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: fontBody }}>✕ Salir de foco</button>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '72px 24px 64px' }}>{editorInner}</div>
        </div>
      )}

      {/* collection context menu */}
      {ctxMenu && (() => {
        const f = folders.find(x => x.id === ctxMenu.folderId); if (!f) return null;
        const prot = isProtected(f);
        return (
          <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 60, background: C.card, border: `1px solid ${C.borderEl}`, borderRadius: 10, padding: 4, minWidth: 180, boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
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
          <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.borderEl}`, borderRadius: 14, width: '100%', maxWidth: 400, padding: 26, fontFamily: fontBody, textAlign: 'center' }}>
            <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.1rem', color: C.text }}>Compartir nota</div>
            <div style={{ fontSize: '0.82rem', color: C.muted, margin: '8px 0 20px', lineHeight: 1.5 }}>Genera una imagen de tu nota para compartirla. El enlace público llegará con Supabase próximamente.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button disabled={sharing} onClick={() => generateShareImage('copy')} style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, borderRadius: 9, padding: 11, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}>Copiar imagen</button>
              <button disabled={sharing} onClick={() => generateShareImage('download')} style={{ flex: 1.3, background: C.blue, color: '#fff', border: 'none', borderRadius: 9, padding: 11, fontSize: '0.82rem', fontWeight: 600, cursor: sharing ? 'default' : 'pointer', fontFamily: fontBody, opacity: sharing ? 0.7 : 1 }}>{sharing ? 'Generando…' : 'Descargar imagen'}</button>
            </div>
          </div>
        </div>
      )}

      {coverPickerOpen && (
        <CoverImagePicker recent={recentCovers} onPick={setCover} onClose={() => setCoverPickerOpen(false)} />
      )}

      {templatePickerOpen && (
        <TemplatePicker
          onCreate={createFromTemplate}
          onBlank={() => { setTemplatePickerOpen(false); onNewNote(); }}
          onClose={() => setTemplatePickerOpen(false)}
        />
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
  return <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.muted, padding: '16px 20px 6px', fontFamily: fontBody }}>{children}</div>;
}

function ViewRow({ Icon, label, count, active, onClick }: { Icon: typeof LayoutGrid; label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '7px 20px', cursor: 'pointer', background: active ? 'rgba(79,143,255,0.05)' : 'transparent', border: 'none', borderLeft: active ? `3px solid ${C.blue}` : '3px solid transparent', color: active ? C.text : C.text2, fontSize: '0.85rem', fontWeight: 500, fontFamily: fontBody, textAlign: 'left' }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
      <Icon size={16} color={active ? C.blue : C.muted} />
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
  iconPickerOpen: boolean; onIconSelect: (name: string) => void; onIconClose: () => void;
}
function CollectionRow(p: CollectionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.folder.id });
  const [hover, setHover] = useState(false);
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, position: 'relative', zIndex: isDragging ? 5 : undefined };
  if (p.renaming) {
    return (
      <div ref={setNodeRef} style={style}>
        <input autoFocus value={p.renameValue} onChange={e => p.setRenameValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') p.onRenameCommit(); if (e.key === 'Escape') p.onRenameCancel(); }} onBlur={p.onRenameCancel}
          style={{ width: 'calc(100% - 32px)', margin: '2px 16px', boxSizing: 'border-box', background: C.card, border: `1px solid ${C.blue}`, borderRadius: 7, padding: '6px 10px', fontSize: '0.82rem', color: C.text, outline: 'none', fontFamily: fontBody }} />
      </div>
    );
  }
  const a = p.active;
  const iconColor = a ? C.blue : hover ? C.olive : C.muted;
  return (
    <div ref={setNodeRef} style={style} className="nb-row" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <span {...attributes} {...listeners} className="nb-row-grip" title="Reordenar" style={{ position: 'absolute', left: 3, top: '50%', transform: 'translateY(-50%)', color: C.muted, cursor: 'grab', touchAction: 'none', opacity: 0, transition: 'opacity 0.12s', display: 'inline-flex' }}><GripVertical size={12} /></span>
      <button onClick={p.onSelect} onContextMenu={e => { e.preventDefault(); p.onContextMenu(e.clientX, e.clientY); }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '7px 20px', cursor: 'pointer', textAlign: 'left', fontFamily: fontBody, fontSize: '0.85rem', fontWeight: 500,
          background: a ? 'rgba(79,143,255,0.05)' : 'transparent', color: a ? C.text : C.text2, border: 'none', borderLeft: a ? `3px solid ${C.blue}` : '3px solid transparent' }}
        onMouseEnter={e => { if (!a) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
        onMouseLeave={e => { if (!a) e.currentTarget.style.background = 'transparent'; }}>
        <NotebookIcon name={p.folder.icon} size={16} color={iconColor} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.folder.name}</span>
        <span style={{ fontSize: '0.7rem', color: C.muted }}>{p.count}</span>
      </button>
      <button className="nb-row-more" aria-label="Opciones" onClick={e => { e.stopPropagation(); p.onMore(e.currentTarget.getBoundingClientRect()); }}
        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: 5, background: C.card, border: `1px solid ${C.border}`, color: C.text2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.12s' }}><MoreHorizontal size={13} /></button>
      {p.iconPickerOpen && <IconPicker current={p.folder.icon} onSelect={p.onIconSelect} onClose={p.onIconClose} />}
    </div>
  );
}

function EmptyEditor({ view, crumbName, onNew }: { view: View; crumbName: string; onNew: () => void }) {
  const collectionEmpty = view !== 'all' && view !== 'favorites';
  return (
    <div style={{ margin: 'auto', textAlign: 'center', padding: 60, maxWidth: 420 }}>
      <BookOpen size={40} color={C.faint} style={{ margin: '0 auto 16px' }} />
      <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.3rem', color: C.text, marginBottom: 8 }}>
        {view === 'favorites' ? 'Sin notas favoritas' : collectionEmpty ? `Aún no tienes notas en ${crumbName}` : 'Empieza a escribir tu diario de trading'}
      </div>
      <div style={{ fontSize: '0.88rem', color: C.text3, lineHeight: 1.6, marginBottom: 20 }}>
        {view === 'favorites' ? 'Marca notas con ★ para verlas aquí.' : 'Crea tu primera nota con /, escribe libremente o inserta tus operaciones.'}
      </div>
      <button onClick={onNew} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}><Plus size={16} /> Nueva nota</button>
    </div>
  );
}

function TradePicker({ trades, onPick, onClose }: { trades: Trade[]; onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const filtered = trades.filter(t => `${t.asset} ${t.setup} ${t.date}`.toLowerCase().includes(q.toLowerCase())).slice(0, 40);
  const fmt = (n: number) => `${n >= 0 ? '+' : '-'}$${Math.abs(n).toFixed(0)}`;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.borderEl}`, borderRadius: 14, width: '100%', maxWidth: 460, maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: fontBody }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.95rem', color: C.text, marginBottom: 10 }}>Insertar operación</div>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por activo, setup, fecha…" style={{ width: '100%', boxSizing: 'border-box', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontSize: '0.82rem', color: C.text, outline: 'none', fontFamily: fontBody }} />
        </div>
        <div style={{ overflowY: 'auto' }}>
          {filtered.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: '0.82rem' }}>No hay operaciones</div>}
          {filtered.map(t => (
            <button key={t.id} onClick={() => onPick(t.id)} style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '11px 16px', background: 'transparent', border: 'none', borderTop: `1px solid ${C.borderSubtle}`, cursor: 'pointer', fontFamily: fontBody }}
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
  return <button onClick={onClick} title={title} style={{ width: 36, height: 36, borderRadius: 8, background: active ? 'rgba(79,143,255,0.12)' : 'transparent', border: `1px solid ${C.border}`, color: active ? C.blue : C.text2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>{children}</button>;
}
function MenuRow({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: danger ? C.red : C.text2, padding: '8px 10px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: 6, fontFamily: fontBody, display: 'flex', gap: 8, alignItems: 'center' }}
    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{children}</button>;
}

export default Notebook;

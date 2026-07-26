import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useNotebookStore, useUserFolders, useUserNotes,
  DEFAULT_FOLDER_NAMES, type Folder, type Note,
} from '../../store/notebookStore';
import { useToast } from '../../components/UI/ToastProvider';
import { usePlan } from '../../hooks/usePlan';
import { useUpgradeModal } from '../../store/upgradeModalStore';
import { ConfirmDialog } from '../../components/UI/ConfirmDialog';

const syne: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const body: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" };
const EMOJIS = ['📓', '📊', '🧠', '🎯', '📌', '📝', '💡', '⚙️', '📈', '📉', '🔥', '⭐', '🗂️', '💰', '🧭', '🎓'];

function isProtected(f: Folder) { return !!f.system || DEFAULT_FOLDER_NAMES.includes(f.name); }
function stripHtml(html: string) { return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }
function relTime(iso: string) {
  const d = new Date(iso); const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return 'Ahora'; if (m < 60) return `Hace ${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `Hace ${h}h`;
  const days = Math.floor(h / 24); if (days === 1) return 'Ayer'; if (days < 7) return `Hace ${days}d`;
  const mo = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} ${mo[d.getMonth()]}`;
}

export function Notebook() {
  const folders = useUserFolders();
  const notes = useUserNotes();
  const ensureDefaults = useNotebookStore(s => s.ensureDefaultFolders);
  const addFolder = useNotebookStore(s => s.addFolder);
  const updateFolder = useNotebookStore(s => s.updateFolder);
  const deleteFolder = useNotebookStore(s => s.deleteFolder);
  const addNote = useNotebookStore(s => s.addNote);
  const updateNote = useNotebookStore(s => s.updateNote);
  const deleteNote = useNotebookStore(s => s.deleteNote);
  const { push } = useToast();
  const { isAtFolderLimit, isFree } = usePlan();
  const openUpgrade = useUpgradeModal(s => s.open);

  useEffect(() => { ensureDefaults(); }, [ensureDefaults]);

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [savedHint, setSavedHint] = useState(false);

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [ctxMenu, setCtxMenu] = useState<{ folderId: string; x: number; y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [iconPickerId, setIconPickerId] = useState<string | null>(null);
  const [noteMenuOpen, setNoteMenuOpen] = useState(false);
  const [movePickerOpen, setMovePickerOpen] = useState(false);
  const [confirmFolderId, setConfirmFolderId] = useState<string | null>(null);
  const [confirmNoteId, setConfirmNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeFolderId && folders.length > 0) setActiveFolderId(folders[0].id);
  }, [folders, activeFolderId]);

  const searching = search.trim().length > 0 || favOnly;
  const filteredNotes = useMemo(() => {
    let list = notes;
    if (favOnly) list = list.filter(n => n.favorite);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n => n.title.toLowerCase().includes(q) || stripHtml(n.content).toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q)));
    } else if (activeFolderId && !favOnly) {
      list = list.filter(n => n.folderId === activeFolderId);
    }
    return list;
  }, [notes, search, favOnly, activeFolderId]);

  useEffect(() => {
    if (filteredNotes.length > 0 && !filteredNotes.some(n => n.id === activeNoteId)) setActiveNoteId(filteredNotes[0].id);
    else if (filteredNotes.length === 0) setActiveNoteId(null);
  }, [filteredNotes, activeNoteId]);

  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId) || null, [notes, activeNoteId]);
  const noteCount = (folderId: string) => notes.filter(n => n.folderId === folderId).length;

  // ── editor autosave ──
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (editorRef.current && activeNote && editorRef.current.innerHTML !== activeNote.content) editorRef.current.innerHTML = activeNote.content;
    if (titleRef.current && activeNote) titleRef.current.value = activeNote.title;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNote?.id]);

  const scheduleSave = (updates: Partial<Note>) => {
    if (!activeNote) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateNote(activeNote.id, updates);
      setSavedHint(true);
      setTimeout(() => setSavedHint(false), 1500);
    }, 1500);
  };
  const onContentInput = () => { if (editorRef.current) scheduleSave({ content: editorRef.current.innerHTML }); };
  const onTitleInput = () => { if (titleRef.current) scheduleSave({ title: titleRef.current.value }); };
  const exec = (cmd: string, val?: string) => { document.execCommand(cmd, false, val); onContentInput(); };

  // ── folders ──
  const userFolderCount = folders.length;
  const folderLimitReached = isAtFolderLimit(userFolderCount);
  const startCreateFolder = () => {
    if (folderLimitReached) return;
    setCreatingFolder(true); setNewFolderName('');
  };
  const commitCreateFolder = () => {
    const name = newFolderName.trim();
    if (name) { const f = addFolder(name, '🗂️'); setActiveFolderId(f.id); push({ kind: 'success', text: 'Carpeta creada' }); }
    setCreatingFolder(false); setNewFolderName('');
  };
  const doDeleteFolder = () => {
    if (!confirmFolderId) return;
    deleteFolder(confirmFolderId);
    push({ kind: 'success', text: 'Carpeta eliminada' });
    setActiveFolderId(folders.find(f => f.name === 'Mis notas')?.id ?? folders[0]?.id ?? null);
    setConfirmFolderId(null);
  };

  // ── notes ──
  const onNewNote = (folderId?: string) => {
    const fid = folderId ?? activeFolderId;
    if (!fid) return;
    const note = addNote(fid, 'Nueva nota');
    setActiveFolderId(fid); setFavOnly(false); setSearch(''); setActiveNoteId(note.id);
    setTimeout(() => titleRef.current?.focus(), 60);
  };
  const doDeleteNote = () => { if (confirmNoteId) { deleteNote(confirmNoteId); push({ kind: 'success', text: 'Nota eliminada' }); setConfirmNoteId(null); } };
  const duplicateNote = () => {
    if (!activeNote) return;
    const copy = addNote(activeNote.folderId, `${activeNote.title} (copia)`, activeNote.content);
    updateNote(copy.id, { tags: [...activeNote.tags] });
    setActiveNoteId(copy.id); setNoteMenuOpen(false);
    push({ kind: 'success', text: 'Nota duplicada' });
  };
  const moveNote = (folderId: string) => {
    if (!activeNote) return;
    updateNote(activeNote.id, { folderId });
    setActiveFolderId(folderId); setMovePickerOpen(false); setNoteMenuOpen(false);
    push({ kind: 'success', text: 'Nota movida' });
  };
  const onAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !activeNote) return;
    const tag = tagInput.trim();
    if (tag && !activeNote.tags.includes(tag)) updateNote(activeNote.id, { tags: [...activeNote.tags, tag] });
    setTagInput('');
  };

  const activeFolder = folders.find(f => f.id === activeFolderId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 280px 1fr', height: '100%' }} onClick={() => { setCtxMenu(null); setNoteMenuOpen(false); }}>
      {/* ── LEFT: folders ── */}
      <div style={{ background: 'var(--card)', borderRight: '1px solid var(--border-subtle)', padding: '18px 12px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, opacity: 0.6 }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar notas..."
            style={{ ...body, width: '100%', boxSizing: 'border-box', background: 'var(--card-2)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 10px 8px 30px', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>
        <button
          onClick={() => setFavOnly(v => !v)}
          style={{ ...body, background: favOnly ? 'rgba(120,97,255,0.1)' : 'transparent', color: favOnly ? 'var(--indigo)' : 'var(--text-muted)', border: 'none', borderRadius: 6, padding: '5px 8px', fontSize: '0.72rem', textAlign: 'left', cursor: 'pointer', marginTop: 2 }}
        >⭐ {favOnly ? 'Mostrando favoritas' : 'Solo favoritas'}</button>

        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 600, padding: '14px 8px 8px' }}>Carpetas</div>

        {folders.map(f => {
          const active = f.id === activeFolderId && !searching;
          if (renamingId === f.id) {
            return (
              <input
                key={f.id} autoFocus value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { updateFolder(f.id, { name: renameValue.trim() || f.name }); setRenamingId(null); } if (e.key === 'Escape') setRenamingId(null); }}
                onBlur={() => setRenamingId(null)}
                style={{ ...body, background: 'var(--card-2)', border: '1px solid var(--blue)', borderRadius: 7, padding: '7px 10px', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none', margin: '1px 0' }}
              />
            );
          }
          return (
            <div key={f.id} style={{ position: 'relative' }}>
              <button
                onClick={() => { setActiveFolderId(f.id); setFavOnly(false); setSearch(''); }}
                onContextMenu={e => { e.preventDefault(); setCtxMenu({ folderId: f.id, x: e.clientX, y: e.clientY }); }}
                style={{
                  ...body, width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  background: active ? 'rgba(79,143,255,0.1)' : 'transparent',
                  color: active ? 'var(--blue)' : '#c8c8d8',
                  border: 'none', borderLeft: active ? '2px solid var(--blue)' : '2px solid transparent',
                  padding: active ? '8px 10px 8px 8px' : '8px 10px', borderRadius: 7, marginBottom: 2,
                  fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 14 }}>{f.icon}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <span style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '1px 6px', fontSize: '0.62rem', color: 'var(--text-tertiary)' }}>{noteCount(f.id)}</span>
              </button>
              {iconPickerId === f.id && (
                <div style={{ position: 'absolute', top: 38, left: 0, zIndex: 40, background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
                  {EMOJIS.map(em => (
                    <button key={em} onClick={() => { updateFolder(f.id, { icon: em }); setIconPickerId(null); }} style={{ background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer', padding: 4, borderRadius: 6 }}>{em}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* create folder */}
        {creatingFolder ? (
          <input
            autoFocus value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitCreateFolder(); if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); } }}
            onBlur={commitCreateFolder}
            placeholder="Nombre de la carpeta..."
            style={{ ...body, marginTop: 8, background: 'var(--card-2)', border: '1px solid var(--blue)', borderRadius: 7, padding: '8px 10px', fontSize: '0.78rem', color: 'var(--text-primary)', outline: 'none' }}
          />
        ) : folderLimitReached && isFree ? (
          <div style={{ marginTop: 12, background: 'rgba(79,143,255,0.06)', border: '1px solid rgba(79,143,255,0.12)', borderRadius: 8, padding: 10, fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Has alcanzado el límite del plan Gratis
            <button onClick={() => openUpgrade()} style={{ display: 'block', background: 'transparent', border: 'none', color: 'var(--blue)', cursor: 'pointer', padding: '4px 0 0', fontSize: '0.72rem', fontWeight: 600 }}>Ver Plan Pro →</button>
          </div>
        ) : (
          <button
            onClick={startCreateFolder}
            style={{ ...body, marginTop: 12, width: '100%', background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-tertiary)', borderRadius: 7, padding: 8, fontSize: '0.78rem', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--blue)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          >＋ Nueva carpeta</button>
        )}
      </div>

      {/* ── MIDDLE: notes list ── */}
      <div style={{ background: 'var(--card)', borderRight: '1px solid var(--border-subtle)', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ ...syne, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <span>{searching ? '🔍' : activeFolder?.icon}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{searching ? 'Resultados' : activeFolder?.name ?? 'Notas'}</span>
          </div>
          <button
            onClick={() => onNewNote()}
            style={{ ...body, background: 'rgba(79,143,255,0.1)', color: 'var(--blue)', border: '1px solid rgba(79,143,255,0.25)', borderRadius: 7, padding: '5px 10px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,143,255,0.16)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(79,143,255,0.1)')}
          >＋ Nueva nota</button>
        </div>

        {filteredNotes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 12px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: '0.82rem', marginBottom: 14 }}>{searching ? 'Sin resultados' : 'Esta carpeta está vacía'}</div>
            {!searching && <button onClick={() => onNewNote()} style={{ ...body, background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>＋ Crear primera nota</button>}
          </div>
        ) : filteredNotes.map(n => {
          const active = n.id === activeNoteId;
          const preview = stripHtml(n.content);
          return (
            <button
              key={n.id} onClick={() => setActiveNoteId(n.id)}
              style={{
                ...body, textAlign: 'left', cursor: 'pointer',
                background: active ? 'rgba(79,143,255,0.06)' : 'transparent',
                borderLeft: active ? '2px solid var(--blue)' : '2px solid transparent',
                border: 'none', borderRadius: 8, padding: active ? '12px 14px 12px 12px' : '12px 14px', marginBottom: 4,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                {n.favorite && <span style={{ color: 'var(--indigo)', fontSize: 11 }}>★</span>}
                {n.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.5, marginTop: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {preview || 'Sin contenido'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{relTime(n.updatedAt)}</span>
                {n.tags.length > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{n.tags.length} tag{n.tags.length > 1 ? 's' : ''}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── RIGHT: editor ── */}
      <div style={{ background: 'var(--bg)', padding: '24px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {!activeNote ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 60, margin: 'auto' }}>Selecciona o crea una nota</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <input
                ref={titleRef} defaultValue={activeNote.title} onInput={onTitleInput}
                placeholder="Sin título"
                style={{ ...syne, flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid transparent', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-primary)', outline: 'none', padding: '0 0 4px' }}
                onFocus={e => (e.currentTarget.style.borderBottomColor = 'var(--border-subtle)')}
                onBlur={e => (e.currentTarget.style.borderBottomColor = 'transparent')}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                {savedHint && <span style={{ fontSize: 11, color: 'var(--blue)', marginRight: 4 }}>Guardado</span>}
                <IconBtn onClick={() => updateNote(activeNote.id, { favorite: !activeNote.favorite })} active={!!activeNote.favorite} title="Favorito">{activeNote.favorite ? '★' : '☆'}</IconBtn>
                <IconBtn onClick={(e) => { e.stopPropagation(); setNoteMenuOpen(o => !o); setMovePickerOpen(false); }} title="Más">⋯</IconBtn>
                {noteMenuOpen && (
                  <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 34, right: 0, zIndex: 40, background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, minWidth: 180, boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
                    <MenuRow onClick={duplicateNote}>Duplicar</MenuRow>
                    <MenuRow onClick={() => setMovePickerOpen(v => !v)}>Mover a carpeta ▸</MenuRow>
                    {movePickerOpen && (
                      <div style={{ maxHeight: 180, overflowY: 'auto', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', margin: '4px 0' }}>
                        {folders.filter(f => f.id !== activeNote.folderId).map(f => (
                          <MenuRow key={f.id} onClick={() => moveNote(f.id)}>{f.icon} {f.name}</MenuRow>
                        ))}
                      </div>
                    )}
                    <MenuRow danger onClick={() => { setNoteMenuOpen(false); setConfirmNoteId(activeNote.id); }}>Eliminar</MenuRow>
                  </div>
                )}
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
              Creado: {new Date(activeNote.createdAt).toLocaleDateString('es-ES')} · Última edición: {new Date(activeNote.updatedAt).toLocaleDateString('es-ES')}
            </div>

            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '16px 0' }} />

            {/* toolbar */}
            <div style={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
              <TB onClick={() => exec('undo')}>↶</TB>
              <TB onClick={() => exec('redo')}>↷</TB>
              <TBDivider />
              <TB onClick={() => exec('bold')}><b>B</b></TB>
              <TB onClick={() => exec('italic')}><i>I</i></TB>
              <TB onClick={() => exec('underline')}><u>U</u></TB>
              <TB onClick={() => exec('strikeThrough')}><s>S</s></TB>
              <TBDivider />
              <TB onClick={() => exec('formatBlock', 'h2')}>H</TB>
              <TB onClick={() => exec('insertUnorderedList')}>≡</TB>
              <TB onClick={() => exec('formatBlock', 'pre')}>{'</>'}</TB>
              <TB onClick={() => { const url = prompt('URL del enlace'); if (url) exec('createLink', url); }}>🔗</TB>
            </div>

            {/* content */}
            <div
              ref={editorRef} contentEditable suppressContentEditableWarning onInput={onContentInput}
              data-placeholder="Empieza a escribir..."
              className="nb-editor"
              style={{ flex: 1, minHeight: 240, padding: '16px 0', fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text)', outline: 'none', ...body }}
            />

            {/* tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border-subtle)', marginTop: 12 }}>
              {activeNote.tags.map(tag => (
                <span key={tag} style={{ ...body, background: 'rgba(79,143,255,0.08)', color: 'var(--blue)', border: '1px solid rgba(79,143,255,0.2)', borderRadius: 12, padding: '3px 10px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {tag}
                  <button onClick={() => updateNote(activeNote.id, { tags: activeNote.tags.filter(t => t !== tag) })} style={{ background: 'transparent', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: 11, padding: 0 }}>✕</button>
                </span>
              ))}
              <input
                value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={onAddTag}
                placeholder="＋ Añadir tag..."
                style={{ ...body, background: 'var(--card-2)', border: '1px dashed var(--border-subtle)', borderRadius: 7, padding: '6px 10px', fontSize: '0.72rem', color: 'var(--text-secondary)', outline: 'none', width: 130 }}
              />
            </div>
          </>
        )}
      </div>

      {/* folder context menu */}
      {ctxMenu && (() => {
        const f = folders.find(x => x.id === ctxMenu.folderId);
        if (!f) return null;
        const protectedF = isProtected(f);
        return (
          <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 60, background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, minWidth: 170, boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
            <MenuRow onClick={() => { setRenamingId(f.id); setRenameValue(f.name); setCtxMenu(null); }}>Renombrar</MenuRow>
            <MenuRow onClick={() => { setIconPickerId(f.id); setActiveFolderId(f.id); setCtxMenu(null); }}>Cambiar icono</MenuRow>
            {!protectedF && <MenuRow danger onClick={() => { setConfirmFolderId(f.id); setCtxMenu(null); }}>Eliminar</MenuRow>}
          </div>
        );
      })()}

      <ConfirmDialog
        open={!!confirmFolderId}
        title={`¿Eliminar carpeta y sus ${confirmFolderId ? noteCount(confirmFolderId) : 0} notas?`}
        description='Las notas se moverán a "Mis notas".'
        confirmText="Eliminar" destructive
        onConfirm={doDeleteFolder} onCancel={() => setConfirmFolderId(null)}
      />
      <ConfirmDialog
        open={!!confirmNoteId}
        title="¿Eliminar esta nota?" description="Esta acción no se puede deshacer."
        confirmText="Eliminar" destructive
        onConfirm={doDeleteNote} onCancel={() => setConfirmNoteId(null)}
      />
    </div>
  );
}

function IconBtn({ children, onClick, active, title }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void; active?: boolean; title?: string }) {
  return (
    <button onClick={onClick} title={title} style={{ width: 30, height: 30, borderRadius: 7, background: active ? 'rgba(120,97,255,0.12)' : 'transparent', border: '1px solid var(--border-subtle)', color: active ? 'var(--indigo)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{children}</button>
  );
}
function MenuRow({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{ ...body, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: danger ? 'var(--danger)' : 'var(--text)', padding: '8px 10px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: 6 }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{children}</button>
  );
}
function TB({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onMouseDown={e => e.preventDefault()} onClick={onClick} style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}>{children}</button>
  );
}
function TBDivider() { return <span style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 4px' }} />; }

export default Notebook;

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNotebookStore, useUserFolders, useUserNotes } from '../../store/notebookStore';
import { useUserTrades, getDailyPnL } from '../../store/tradeStore';
import { useToast } from '../../components/UI/ToastProvider';
import { usePlan } from '../../hooks/usePlan';
import { useUpgradeModal } from '../../store/upgradeModalStore';
import { ConfirmDialog } from '../../components/UI/ConfirmDialog';
const syne: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };

export function Notebook() {
  const folders = useUserFolders();
  const notes = useUserNotes();
  const trades = useUserTrades();
  const ensureDefaults = useNotebookStore(s => s.ensureDefaultFolders);
  const addFolder = useNotebookStore(s => s.addFolder);
  const deleteFolder = useNotebookStore(s => s.deleteFolder);
  const addNote = useNotebookStore(s => s.addNote);
  const updateNote = useNotebookStore(s => s.updateNote);
  const deleteNote = useNotebookStore(s => s.deleteNote);
  const { push } = useToast();

  useEffect(() => { ensureDefaults(); }, [ensureDefaults]);

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [savedHint, setSavedHint] = useState(false);

  // Default folder selection
  useEffect(() => {
    if (!activeFolderId && folders.length > 0) {
      const diary = folders.find(f => f.name === 'Diario Diario') || folders[0];
      setActiveFolderId(diary.id);
    }
  }, [folders, activeFolderId]);

  const filteredNotes = useMemo(() => {
    let list = notes;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q)));
    } else if (activeFolderId) {
      const all = folders.find(f => f.id === activeFolderId)?.name === 'Todas las notas';
      if (!all) list = list.filter(n => n.folderId === activeFolderId);
    }
    return list;
  }, [notes, search, activeFolderId, folders]);

  // Auto-select first note when folder changes
  useEffect(() => {
    if (filteredNotes.length > 0 && !filteredNotes.some(n => n.id === activeNoteId)) {
      setActiveNoteId(filteredNotes[0].id);
    } else if (filteredNotes.length === 0) {
      setActiveNoteId(null);
    }
  }, [filteredNotes, activeNoteId]);

  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId) || null, [notes, activeNoteId]);

  // Debounced auto-save
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync editor when active note changes
  useEffect(() => {
    if (editorRef.current && activeNote) {
      if (editorRef.current.innerHTML !== activeNote.content) {
        editorRef.current.innerHTML = activeNote.content;
      }
    }
    if (titleRef.current && activeNote) titleRef.current.value = activeNote.title;
  }, [activeNote?.id]);

  const scheduleSave = (updates: { content?: string; title?: string; tags?: string[]; images?: string[] }) => {
    if (!activeNote) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateNote(activeNote.id, updates);
      setSavedHint(true);
      setTimeout(() => setSavedHint(false), 1500);
    }, 800);
  };

  const onContentInput = () => {
    if (!editorRef.current) return;
    scheduleSave({ content: editorRef.current.innerHTML });
  };
  const onTitleInput = () => {
    if (!titleRef.current) return;
    scheduleSave({ title: titleRef.current.value });
  };

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    onContentInput();
  };

  const onLogDay = () => {
    const diary = folders.find(f => f.name === 'Diario Diario');
    if (!diary) return;
    const today = new Date().toISOString().slice(0, 10);
    const dayPnl = getDailyPnL(trades, today);
    const dayTrades = trades.filter(t => t.date === today);
    const win = dayTrades.filter(t => t.pnl > 0).length;
    const lose = dayTrades.filter(t => t.pnl < 0).length;
    const content = `<p>Resumen del día <strong>${today}</strong></p><p>Net PnL: <strong>${dayPnl >= 0 ? '+' : '-'}$${Math.abs(dayPnl).toFixed(2)}</strong></p><p>Operaciones: ${dayTrades.length} (${win}W / ${lose}L)</p><p><br></p><p>Reflexión:</p>`;
    const note = addNote(diary.id, `Diario · ${today}`, content, today);
    setActiveFolderId(diary.id);
    setActiveNoteId(note.id);
    push({ kind: 'success', text: 'Nota de día creada' });
  };

  const { isAtFolderLimit, isFree } = usePlan();
  const openUpgrade = useUpgradeModal(s => s.open);
  const userFolderCount = folders.filter(f => f.name !== 'Todas las notas').length;
  const folderLimitReached = isAtFolderLimit(userFolderCount);

  const onAddFolder = () => {
    if (folderLimitReached) {
      openUpgrade('Has alcanzado el límite de 3 carpetas en el plan gratuito.');
      return;
    }
    const name = prompt('Nombre de la carpeta');
    if (!name) return;
    const f = addFolder(name.trim(), '📁');
    setActiveFolderId(f.id);
  };

  const [confirmFolderId, setConfirmFolderId] = useState<string | null>(null);
  const [confirmNoteId, setConfirmNoteId] = useState<string | null>(null);

  const onDeleteFolder = (id: string) => setConfirmFolderId(id);
  const doDeleteFolder = () => {
    if (!confirmFolderId) return;
    deleteFolder(confirmFolderId);
    push({ kind: 'success', text: 'Carpeta eliminada' });
    setActiveFolderId(folders.find(f => f.name === 'Mis notas')?.id ?? null);
    setConfirmFolderId(null);
  };
  const doDeleteNote = () => {
    if (!confirmNoteId) return;
    deleteNote(confirmNoteId);
    push({ kind: 'success', text: 'Nota eliminada' });
    setConfirmNoteId(null);
  };

  const onNewNote = () => {
    if (!activeFolderId) return;
    const note = addNote(activeFolderId, 'Nueva nota');
    setActiveNoteId(note.id);
  };

  const onAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !activeNote) return;
    const tag = tagInput.trim();
    if (!tag) return;
    if (!activeNote.tags.includes(tag)) {
      updateNote(activeNote.id, { tags: [...activeNote.tags, tag] });
    }
    setTagInput('');
  };
  const onRemoveTag = (tag: string) => {
    if (!activeNote) return;
    updateNote(activeNote.id, { tags: activeNote.tags.filter(t => t !== tag) });
  };

  const onUploadImage = (files: FileList | null) => {
    if (!files || !activeNote) return;
    Promise.all(Array.from(files).map(f => new Promise<string>(res => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(f);
    }))).then(arr => {
      updateNote(activeNote.id, { images: [...activeNote.images, ...arr] });
      push({ kind: 'success', text: 'Imagen añadida' });
    });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 200px 1fr', height: '100%' }}>
      {/* Col 1 — Folders */}
      <div style={{ background: 'var(--bg2)', borderRight: '1px solid var(--dim)', padding: 10, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar notas..."
          style={{ width: '100%', background: 'var(--dim2)', border: '1px solid var(--border)', padding: '6px 8px', fontSize: 11, borderRadius: 6, color: 'var(--text)', fontFamily: "'Inter', sans-serif", outline: 'none' }}
        />
        {folderLimitReached && isFree ? (
          <div style={{
            background: 'rgba(79,143,255,0.06)', border: '1px solid rgba(79,143,255,0.12)',
            borderRadius: 6, padding: 8, fontSize: 11, color: '#888898', lineHeight: 1.4,
          }}>
            Has alcanzado el límite de 3 carpetas.{' '}
            <button
              onClick={() => openUpgrade()}
              style={{ background: 'transparent', border: 'none', color: '#4f8fff', cursor: 'pointer', padding: 0, fontSize: 11, fontWeight: 600 }}
            >Ver Plan Pro →</button>
          </div>
        ) : (
        <button onClick={onAddFolder} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 11, padding: 4, textAlign: 'left', cursor: 'pointer' }}>
          ＋ Añadir carpeta
        </button>
        )}
        <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.18em', marginTop: 4 }}>CARPETAS</div>
        {folders.map(f => {
          const active = f.id === activeFolderId;
          const isDefault = ['Trade Notes', 'Diario Diario', 'Sessions Recap', 'Estrategias', 'Psicología', 'Mis notas', 'Todas las notas'].includes(f.name);
          return (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setActiveFolderId(f.id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                  background: active ? 'var(--blue-dim)' : 'transparent',
                  color: active ? 'var(--blue)' : 'var(--text)',
                  border: 'none', padding: 6, fontSize: 12, borderRadius: 5,
                  cursor: 'pointer', textAlign: 'left',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <span>{f.icon}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              </button>
              {!isDefault && (
                <button onClick={() => onDeleteFolder(f.id)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11 }}>×</button>
              )}
            </div>
          );
        })}
      </div>

      {/* Col 2 — Notes list */}
      <div style={{ background: 'var(--bg2)', borderRight: '1px solid var(--dim)', padding: 10, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ ...syne, fontWeight: 700, fontSize: 13, color: '#fff' }}>
            {folders.find(f => f.id === activeFolderId)?.name ?? 'Notas'}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={onLogDay} style={{ background: 'var(--blue)', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>Log día</button>
            <button onClick={onNewNote} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '3px 6px', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>＋</button>
          </div>
        </div>
        {filteredNotes.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 11, padding: 10, textAlign: 'center' }}>Sin notas. Crea una con ＋</div>
        ) : filteredNotes.map(n => {
          const active = n.id === activeNoteId;
          return (
            <button
              key={n.id}
              onClick={() => setActiveNoteId(n.id)}
              style={{
                background: active ? 'var(--dim2)' : 'transparent',
                border: active ? '1px solid var(--border2)' : '1px solid transparent',
                padding: 8, borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                color: 'var(--text)', fontFamily: "'Inter', sans-serif",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{n.date}</div>
            </button>
          );
        })}
      </div>

      {/* Col 3 — Editor */}
      <div style={{ background: 'var(--bg)', padding: '14px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!activeNote ? (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
            Selecciona o crea una nota
          </div>
        ) : (
          <>
            <div style={{ paddingBottom: 10, borderBottom: '1px solid var(--dim)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <input
                  ref={titleRef}
                  defaultValue={activeNote.title}
                  onInput={onTitleInput}
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: '#fff',
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {savedHint && <span style={{ fontSize: 11, color: 'var(--blue)' }}>✓ Guardado</span>}
                  <button
                    onClick={() => setConfirmNoteId(activeNote.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}
                  >🗑</button>
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                Creado: {new Date(activeNote.createdAt).toLocaleString('es-ES')} · Última edición: {new Date(activeNote.updatedAt).toLocaleString('es-ES')}
              </div>
            </div>

            {/* Toolbar */}
            <div style={{
              display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap',
              border: '1px solid var(--dim)', borderRadius: 6, padding: 4, fontSize: 11,
            }}>
              <ToolbarBtn onClick={() => exec('undo')}>↩</ToolbarBtn>
              <ToolbarBtn onClick={() => exec('redo')}>↪</ToolbarBtn>
              <Divider />
              <ToolbarBtn onClick={() => exec('bold')}><b>B</b></ToolbarBtn>
              <ToolbarBtn onClick={() => exec('italic')}><i>I</i></ToolbarBtn>
              <ToolbarBtn onClick={() => exec('underline')}><u>U</u></ToolbarBtn>
              <ToolbarBtn onClick={() => exec('strikeThrough')}><s>S</s></ToolbarBtn>
              <Divider />
              <ToolbarBtn onClick={() => exec('insertUnorderedList')}>≡</ToolbarBtn>
              <ToolbarBtn onClick={() => exec('formatBlock', 'h2')}>H</ToolbarBtn>
              <Divider />
              <label style={{ cursor: 'pointer', padding: '4px 8px', color: 'var(--text)' }}>
                📎
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => onUploadImage(e.target.files)} />
              </label>
            </div>

            {/* Editor */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={onContentInput}
              style={{
                minHeight: 240, padding: 14,
                background: 'transparent',
                border: '1px solid var(--dim)', borderRadius: 8,
                fontSize: 13, color: '#c8d4e8', lineHeight: 1.7,
                fontFamily: "'Inter', sans-serif", outline: 'none',
              }}
              data-placeholder="Escribe algo, o pulsa '/' para comandos..."
            />

            {/* Images */}
            {activeNote.images.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid var(--dim)' }}>
                {activeNote.images.map((src, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={src} alt="" style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--border)' }} />
                    <button
                      onClick={() => updateNote(activeNote.id, { images: activeNote.images.filter((_, j) => j !== i) })}
                      style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--red)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer' }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--dim)' }}>
              {activeNote.tags.map(tag => (
                <span key={tag} style={{ background: 'var(--blue-dim)', color: 'var(--blue)', padding: '3px 9px', borderRadius: 999, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  #{tag}
                  <button onClick={() => onRemoveTag(tag)} style={{ background: 'transparent', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: 12 }}>×</button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={onAddTag}
                placeholder="Añadir tag…"
                style={{ background: 'var(--dim2)', border: '1px solid var(--border)', padding: '4px 8px', fontSize: 11, borderRadius: 4, color: 'var(--text)', outline: 'none', width: 120 }}
              />
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmFolderId}
        title="¿Eliminar esta carpeta?"
        description='Las notas que contiene se moverán a "Mis notas".'
        confirmText="Eliminar"
        destructive
        onConfirm={doDeleteFolder}
        onCancel={() => setConfirmFolderId(null)}
      />
      <ConfirmDialog
        open={!!confirmNoteId}
        title="¿Eliminar esta nota?"
        description="Esta acción no se puede deshacer."
        confirmText="Eliminar"
        destructive
        onConfirm={doDeleteNote}
        onCancel={() => setConfirmNoteId(null)}
      />
    </div>
  );
}

function ToolbarBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: 'transparent', border: 'none', color: 'var(--text)', padding: '4px 8px', cursor: 'pointer', fontSize: 11, borderRadius: 3 }}>
      {children}
    </button>
  );
}
function Divider() {
  return <span style={{ width: 1, height: 14, background: 'var(--dim)', margin: '0 4px' }} />;
}

export default Notebook;

import { useRef, useState } from 'react';
import { Image as ImageIcon, Move, RefreshCw, Trash2, Upload, Link2, LayoutGrid, X } from 'lucide-react';
import { processImageForUpload } from '../../utils/imageProcessing';
import type { NoteCover } from '../../store/notebookStore';

const fontBody = "'Space Grotesk', sans-serif";
const fontHead = "'Syne', sans-serif";
const C = {
  card: '#151519', card2: '#131418', border: '#1e2029', borderEl: '#2a2c33',
  blue: '#4f8fff', text: '#f7f8fa', text2: '#d0d0dc', muted: '#6b7280',
};

// Preset gradients + solid colors (blue-leaning to match the TRACE palette).
export const COVER_GRADIENTS = [
  'linear-gradient(135deg,#1e3a8a,#4f8fff)',
  'linear-gradient(135deg,#0f172a,#334155)',
  'linear-gradient(135deg,#312e81,#8b5cf6)',
  'linear-gradient(135deg,#7c2d12,#f59e0b)',
  'linear-gradient(135deg,#064e3b,#22c55e)',
  'linear-gradient(135deg,#1e1b4b,#be123c)',
];
export const COVER_COLORS = ['#1e2029', '#1e3a8a', '#312e81', '#7c2d12', '#064e3b', '#4c1d95'];

export function coverBackground(cover?: NoteCover): string | undefined {
  if (!cover) return undefined;
  if (cover.type === 'image' && cover.url) return undefined; // handled as <img>
  return cover.color; // color or gradient css string
}

/* ── Display bar with hover actions + vertical reposition drag ───────────── */
export function CoverBar({ cover, onReposition, onChange, onRemove, height = 240 }: {
  cover: NoteCover;
  onReposition: (position: number) => void;
  onChange: () => void;
  onRemove: () => void;
  height?: number;
}) {
  const [hover, setHover] = useState(false);
  const [repositioning, setRepositioning] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const pos = cover.position ?? 50;

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const bar = barRef.current; if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const move = (ev: MouseEvent) => {
      const y = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height));
      onReposition(Math.round(y * 100));
    };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };

  return (
    <div
      ref={barRef}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onMouseDown={repositioning ? startDrag : undefined}
      style={{ position: 'relative', width: '100%', height, overflow: 'hidden', cursor: repositioning ? 'ns-resize' : 'default', background: cover.type === 'image' ? '#0d0d0f' : (cover.color ?? C.border) }}
    >
      {cover.type === 'image' && cover.url && (
        <img src={cover.url} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `50% ${pos}%`, userSelect: 'none', pointerEvents: 'none' }} />
      )}
      {(hover || repositioning) && (
        <div style={{ position: 'absolute', top: 16, right: 24, display: 'flex', gap: 8 }}>
          {cover.type === 'image' && (
            <CoverBtn active={repositioning} onClick={() => setRepositioning(r => !r)}><Move size={13} />{repositioning ? 'Guardar posición' : 'Reposicionar'}</CoverBtn>
          )}
          <CoverBtn onClick={onChange}><RefreshCw size={13} />Cambiar</CoverBtn>
          <CoverBtn onClick={onRemove}><Trash2 size={13} />Eliminar</CoverBtn>
        </div>
      )}
      {repositioning && (
        <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', fontSize: '0.72rem', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)', fontFamily: fontBody, pointerEvents: 'none' }}>
          Arrastra para recolocar la portada
        </div>
      )}
    </div>
  );
}

function CoverBtn({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: active ? C.blue : 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', borderRadius: 7, padding: '6px 10px', fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer', fontFamily: fontBody }}>{children}</button>
  );
}

/* ── Picker modal: Subir / Galería / Enlace ─────────────────────────────── */
export function CoverImagePicker({ recent, onPick, onClose }: {
  recent: string[];
  onPick: (cover: NoteCover) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'subir' | 'galeria' | 'enlace'>('subir');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const dataUrl = await processImageForUpload(files[0]);
      onPick({ type: 'image', url: dataUrl, position: 50 });
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.borderEl}`, borderRadius: 14, width: '100%', maxWidth: 560, fontFamily: fontBody, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1rem', color: C.text }}>Portada</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', display: 'inline-flex' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: '12px 20px 0' }}>
          {([['subir', 'Subir', Upload], ['galeria', 'Galería', LayoutGrid], ['enlace', 'Enlace', Link2]] as const).map(([k, lbl, Icon]) => (
            <button key={k} onClick={() => setTab(k)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: tab === k ? 'rgba(79,143,255,0.1)' : 'transparent', border: `1px solid ${tab === k ? 'rgba(79,143,255,0.4)' : 'transparent'}`, color: tab === k ? C.blue : C.muted, borderRadius: 8, padding: '8px 14px', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', fontFamily: fontBody }}><Icon size={14} />{lbl}</button>
          ))}
        </div>
        <div style={{ padding: 20, minHeight: 180 }}>
          {tab === 'subir' && (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files); }}
              style={{ border: `1.5px dashed ${C.borderEl}`, borderRadius: 10, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', color: C.muted }}
            >
              <ImageIcon size={28} style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '0.85rem', color: C.text2 }}>{busy ? 'Procesando…' : 'Arrastra una imagen o haz clic para subir'}</div>
              <div style={{ fontSize: '0.72rem', marginTop: 4 }}>Se redimensiona a 1920px</div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { onFile(e.target.files); e.target.value = ''; }} />
            </div>
          )}
          {tab === 'galeria' && (
            <div>
              {recent.length > 0 && (
                <>
                  <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: 8 }}>Usadas recientemente</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 18 }}>
                    {recent.slice(0, 8).map((u, i) => (
                      <button key={i} onClick={() => onPick({ type: 'image', url: u, position: 50 })} style={{ height: 56, borderRadius: 8, border: `1px solid ${C.border}`, background: `#0d0d0f center/cover url(${u})`, cursor: 'pointer' }} />
                    ))}
                  </div>
                </>
              )}
              <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: 8 }}>Degradados</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 18 }}>
                {COVER_GRADIENTS.map(g => (
                  <button key={g} onClick={() => onPick({ type: 'gradient', color: g })} style={{ height: 48, borderRadius: 8, border: `1px solid ${C.border}`, background: g, cursor: 'pointer' }} />
                ))}
              </div>
              <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: 8 }}>Colores</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8 }}>
                {COVER_COLORS.map(c => (
                  <button key={c} onClick={() => onPick({ type: 'color', color: c })} style={{ height: 40, borderRadius: 8, border: `1px solid ${C.border}`, background: c, cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          )}
          {tab === 'enlace' && (
            <div>
              <div style={{ fontSize: '0.78rem', color: C.text2, marginBottom: 10 }}>Pega la URL de una imagen</div>
              <input autoFocus value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" style={{ width: '100%', boxSizing: 'border-box', background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: '0.84rem', color: C.text, outline: 'none', fontFamily: fontBody }} />
              <button disabled={!url.trim()} onClick={() => url.trim() && onPick({ type: 'image', url: url.trim(), position: 50 })} style={{ marginTop: 12, background: C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: '0.82rem', fontWeight: 600, cursor: url.trim() ? 'pointer' : 'default', opacity: url.trim() ? 1 : 0.5, fontFamily: fontBody }}>Usar imagen</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

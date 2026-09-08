import { useCallback, useEffect, useRef, useState } from 'react';

export interface ImageLightboxProps {
  images: string[];       // array of image URLs / dataURLs
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  caption?: string;       // optional caption
  /** Used to name downloaded files: trade-[tradeId]-screenshot-[n].png */
  tradeId?: string;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;
const fontBody = "'Space Grotesk', sans-serif";

const iconBtn: React.CSSProperties = {
  width: 40, height: 40, flexShrink: 0,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
  color: '#fff', fontSize: 16, cursor: 'pointer', fontFamily: fontBody, lineHeight: 1,
  transition: 'background 0.12s',
};

export function ImageLightbox({ images, initialIndex, isOpen, onClose, caption, tradeId }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const pinchRef = useRef<{ dist: number; baseZoom: number } | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  const count = images.length;
  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  // Sync starting index whenever the lightbox (re)opens.
  useEffect(() => {
    if (isOpen) { setIndex(Math.min(Math.max(initialIndex, 0), Math.max(count - 1, 0))); resetView(); }
  }, [isOpen, initialIndex, count, resetView]);

  const go = useCallback((dir: number) => {
    setIndex(i => {
      const next = Math.min(Math.max(i + dir, 0), count - 1);
      if (next !== i) resetView();
      return next;
    });
  }, [count, resetView]);

  const zoomBy = useCallback((delta: number) => {
    setZoom(z => {
      const next = Math.min(Math.max(z + delta, ZOOM_MIN), ZOOM_MAX);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const download = useCallback(() => {
    const src = images[index];
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = `trade-${tradeId ?? 'x'}-screenshot-${index + 1}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [images, index, tradeId]);

  // Remember the trigger element and restore focus on close; focus the overlay when open.
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      const t = setTimeout(() => overlayRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
  }, [isOpen]);

  // Keyboard shortcuts.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': onClose(); break;
        case 'ArrowLeft': go(-1); break;
        case 'ArrowRight': go(1); break;
        case '+': case '=': zoomBy(ZOOM_STEP); break;
        case '-': case '_': zoomBy(-ZOOM_STEP); break;
        case '0': resetView(); break;
        case 'd': case 'D': download(); break;
        case 'Tab': e.preventDefault(); break; // trap focus inside the dialog
      }
    };
    document.addEventListener('keydown', onKey);
    // Lock body scroll while open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose, go, zoomBy, resetView, download]);

  if (!isOpen || count === 0) return null;

  const src = images[index];
  const multiple = count > 1;

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
  };

  // ── Mouse pan ──
  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: pan.x, baseY: pan.y };
    setDragging(true);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setPan({ x: d.baseX + (e.clientX - d.startX), y: d.baseY + (e.clientY - d.startY) });
  };
  const endDrag = () => { dragRef.current = null; setDragging(false); };

  // ── Touch: pinch-zoom, drag-pan, swipe-navigate ──
  const dist = (t: React.TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = { dist: dist(e.touches), baseZoom: zoom };
      swipeRef.current = null;
    } else if (e.touches.length === 1) {
      if (zoom > 1) {
        dragRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, baseX: pan.x, baseY: pan.y };
      } else {
        swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const ratio = dist(e.touches) / pinchRef.current.dist;
      const next = Math.min(Math.max(pinchRef.current.baseZoom * ratio, ZOOM_MIN), ZOOM_MAX);
      setZoom(next);
      if (next <= 1) setPan({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && dragRef.current && zoom > 1) {
      const d = dragRef.current;
      setPan({ x: d.baseX + (e.touches[0].clientX - d.startX), y: d.baseY + (e.touches[0].clientY - d.startY) });
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (swipeRef.current && e.changedTouches.length) {
      const dx = e.changedTouches[0].clientX - swipeRef.current.x;
      const dy = e.changedTouches[0].clientY - swipeRef.current.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    }
    dragRef.current = null;
    pinchRef.current = null;
    swipeRef.current = null;
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={caption || `Visor de imágenes (${index + 1} de ${count})`}
      tabIndex={-1}
      onClick={onClose}
      onWheel={onWheel}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'traceLbFade 0.2s ease', outline: 'none', fontFamily: fontBody, userSelect: 'none',
      }}
    >
      <style>{`@keyframes traceLbFade{from{opacity:0}to{opacity:1}} .trace-lb-icon:hover{background:rgba(255,255,255,0.15)!important}`}</style>

      {/* Top bar */}
      <div
        onClick={e => e.stopPropagation()}
        className="trace-lb-bar"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 2 }}
      >
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, minWidth: 60 }}>{multiple ? `${index + 1} / ${count}` : ''}</div>
        <div style={{ flex: 1, textAlign: 'center', color: 'rgba(255,255,255,0.75)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{caption}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="trace-lb-icon" style={iconBtn} title="Descargar (D)" aria-label="Descargar" onClick={download}>⬇</button>
          <button className="trace-lb-icon" style={iconBtn} title="Alejar (-)" aria-label="Alejar" onClick={() => zoomBy(-ZOOM_STEP)}>−</button>
          <button className="trace-lb-icon" style={iconBtn} title="Acercar (+)" aria-label="Acercar" onClick={() => zoomBy(ZOOM_STEP)}>+</button>
          <button className="trace-lb-icon" style={{ ...iconBtn, width: 'auto', padding: '0 10px', fontSize: 12 }} title="Restablecer zoom (0)" aria-label="Restablecer zoom" onClick={resetView}>{Math.round(zoom * 100)}%</button>
          <button className="trace-lb-icon" style={iconBtn} title="Cerrar (Esc)" aria-label="Cerrar" onClick={onClose}>✕</button>
        </div>
      </div>

      {/* Side navigation arrows */}
      {multiple && (
        <>
          <button
            className="trace-lb-icon" aria-label="Anterior"
            onClick={e => { e.stopPropagation(); go(-1); }}
            disabled={index === 0}
            style={{ ...iconBtn, position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, background: 'rgba(255,255,255,0.1)', fontSize: 22, opacity: index === 0 ? 0.3 : 1, cursor: index === 0 ? 'default' : 'pointer', zIndex: 2 }}
          >←</button>
          <button
            className="trace-lb-icon" aria-label="Siguiente"
            onClick={e => { e.stopPropagation(); go(1); }}
            disabled={index === count - 1}
            style={{ ...iconBtn, position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, background: 'rgba(255,255,255,0.1)', fontSize: 22, opacity: index === count - 1 ? 0.3 : 1, cursor: index === count - 1 ? 'default' : 'pointer', zIndex: 2 }}
          >→</button>
        </>
      )}

      {/* Image */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: 'calc(100vh - 120px)', maxWidth: 'calc(100vw - 80px)', overflow: 'hidden' }}
      >
        <img
          src={src}
          alt={caption ? `${caption} — captura ${index + 1}` : `Captura ${index + 1} de ${count}`}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          draggable={false}
          style={{
            maxWidth: '100%', maxHeight: 'calc(100vh - 120px)', objectFit: 'contain',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: dragging ? 'none' : 'transform 0.2s',
            cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
            userSelect: 'none', touchAction: 'none',
          }}
        />
      </div>

      {/* Bottom thumbnails */}
      {multiple && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, padding: '8px 10px', background: 'rgba(0,0,0,0.4)', borderRadius: 10, maxWidth: 'calc(100vw - 40px)', overflowX: 'auto', zIndex: 2 }}
        >
          {images.map((img, i) => (
            <button
              key={i}
              aria-label={`Ver imagen ${i + 1}`}
              onClick={() => { setIndex(i); resetView(); }}
              style={{ width: 60, height: 60, flexShrink: 0, padding: 0, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', background: 'transparent', border: i === index ? '2px solid #4f8fff' : '2px solid transparent', opacity: i === index ? 1 : 0.6 }}
            >
              <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ImageLightbox;

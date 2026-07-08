import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SOCIAL } from '../../config/social';

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const item: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 10px', borderRadius: 8, fontSize: '0.82rem',
    color: '#c8d4e8', textDecoration: 'none', cursor: 'pointer',
    background: 'transparent', border: 'none', width: '100%', textAlign: 'left',
    fontFamily: "'Space Grotesk', sans-serif",
  };
  const hov = (e: React.MouseEvent<HTMLElement>, on: boolean) => {
    e.currentTarget.style.background = on ? 'rgba(255,255,255,0.03)' : 'transparent';
  };

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 90, fontFamily: "'Space Grotesk', sans-serif" }}>
      {open && (
        <div style={{
          position: 'absolute', bottom: 60, right: 0, width: 240,
          background: '#161618', border: '1px solid #1e1e20', borderRadius: 12,
          padding: 12, boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#fff', padding: '4px 10px 10px' }}>
            ¿Necesitas ayuda?
          </div>
          <button style={item} onClick={() => { setOpen(false); navigate('/faq'); }} onMouseEnter={e => hov(e, true)} onMouseLeave={e => hov(e, false)}>📚 Ver FAQ</button>
          <a style={item} href={`mailto:${SOCIAL.email.support}`} onMouseEnter={e => hov(e, true)} onMouseLeave={e => hov(e, false)}>📧 Contactar soporte</a>
          <a style={item} href={SOCIAL.discord} target="_blank" rel="noreferrer" onMouseEnter={e => hov(e, true)} onMouseLeave={e => hov(e, false)}>💬 Discord</a>
          <button style={item} onClick={() => { setOpen(false); navigate('/funciones'); }} onMouseEnter={e => hov(e, true)} onMouseLeave={e => hov(e, false)}>📖 Guía de inicio rápido</button>
        </div>
      )}
      <button
        aria-label="Ayuda y soporte"
        onClick={() => setOpen(o => !o)}
        style={{
          width: 50, height: 50, borderRadius: '50%',
          background: '#4f8fff', color: '#fff', border: 'none',
          cursor: 'pointer', fontSize: 20, boxShadow: '0 8px 24px rgba(79,143,255,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >{open ? '✕' : '?'}</button>
    </div>
  );
}

export default SupportWidget;

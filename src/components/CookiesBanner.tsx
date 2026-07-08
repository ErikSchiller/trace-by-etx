import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { C, fontHead } from './Marketing/theme';

const KEY = 'trace_cookies_consent';

interface Consent { essential: boolean; preferences: boolean; analytics: boolean }

export function CookiesBanner() {
  const [visible, setVisible] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [prefs, setPrefs] = useState(true);
  const [analytics, setAnalytics] = useState(true);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch { /* ignore */ }
  }, []);

  const save = (consent: Consent) => {
    localStorage.setItem(KEY, JSON.stringify(consent));
    setVisible(false);
  };

  if (!visible) return null;

  const ghost: React.CSSProperties = {
    background: 'transparent', border: `1px solid ${C.border}`, color: C.text2,
    borderRadius: 7, padding: '7px 12px', fontSize: '0.74rem', cursor: 'pointer',
    fontFamily: "'Space Grotesk', sans-serif",
  };

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: 20, maxWidth: 480, zIndex: 100,
      background: C.card2, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
    }}>
      <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: 8 }}>🍪 Cookies</div>
      <div style={{ fontSize: '0.78rem', color: C.text2, lineHeight: 1.5 }}>
        Usamos cookies esenciales para que TRACE funcione, y cookies analíticas anónimas para mejorar el producto. Puedes elegir qué aceptar.
      </div>

      {customize && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.76rem', color: C.text2 }}>
            <input type="checkbox" checked disabled /> Esenciales (siempre activas)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.76rem', color: C.text2 }}>
            <input type="checkbox" checked={prefs} onChange={e => setPrefs(e.target.checked)} /> Preferencias
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.76rem', color: C.text2 }}>
            <input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} /> Analíticas anónimas
          </label>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <button style={ghost} onClick={() => save({ essential: true, preferences: false, analytics: false })}>Solo esenciales</button>
        {customize ? (
          <button style={ghost} onClick={() => save({ essential: true, preferences: prefs, analytics })}>Guardar selección</button>
        ) : (
          <button style={ghost} onClick={() => setCustomize(true)}>Personalizar</button>
        )}
        <button
          style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}
          onClick={() => save({ essential: true, preferences: true, analytics: true })}
        >Aceptar todas</button>
      </div>

      <Link to="/cookies" style={{ display: 'inline-block', marginTop: 10, fontSize: '0.72rem', color: C.blue, textDecoration: 'none' }}>Política de cookies →</Link>
    </div>
  );
}

export default CookiesBanner;

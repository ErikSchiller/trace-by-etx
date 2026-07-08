import { useState } from 'react';
import { MarketingLayout } from '../../components/Marketing/MarketingLayout';
import { PageHero } from '../../components/Marketing/primitives';
import { C } from '../../components/Marketing/theme';

export default function Changelog() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const subscribe = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    try {
      const list = JSON.parse(localStorage.getItem('trace_changelog_waitlist') || '[]');
      localStorage.setItem('trace_changelog_waitlist', JSON.stringify([...new Set([...list, email])]));
    } catch { /* ignore */ }
    setDone(true);
  };

  return (
    <MarketingLayout title="Novedades">
      <PageHero title="Novedades de " blue="TRACE." sub="Aquí publicaremos las nuevas funcionalidades, mejoras y correcciones de cada versión." />
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 24px 80px', textAlign: 'center' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '40px 28px' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>📬</div>
          <div style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 600, marginBottom: 6 }}>Próximamente publicaremos nuestros primeros cambios</div>
          <div style={{ fontSize: '0.85rem', color: C.text2, marginBottom: 20 }}>Suscríbete a las novedades para enterarte.</div>
          {done ? (
            <div style={{ color: C.blue, fontSize: '0.88rem' }}>✓ ¡Listo! Te avisaremos.</div>
          ) : (
            <div style={{ display: 'flex', gap: 8, maxWidth: 360, margin: '0 auto' }}>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', color: C.text, outline: 'none', fontFamily: "'Space Grotesk', sans-serif" }} />
              <button onClick={subscribe} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>Avisarme</button>
            </div>
          )}
        </div>
      </div>
    </MarketingLayout>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { C, GRADIENT, fontHead } from './theme';

export function PageHero({ title, blue, sub }: { title: string; blue?: string; sub: string }) {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', textAlign: 'center', padding: '70px 24px 40px' }}>
      <div style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)', width: 700, height: 600, pointerEvents: 'none', background: 'radial-gradient(circle, rgba(79,143,255,0.07), transparent 60%)' }} />
      <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: 'clamp(2rem, 5vw, 2.8rem)', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.08, marginBottom: 16 }}>
          {title}{blue && <span style={{ color: C.blue }}>{blue}</span>}
        </h1>
        <p style={{ fontSize: '1rem', color: C.text2, lineHeight: 1.6, maxWidth: 560, margin: '0 auto' }}>{sub}</p>
      </div>
    </section>
  );
}

export function CTABanner({ title = 'Empieza a mejorar hoy.', sub = 'Crea tu cuenta gratis y empieza a registrar operaciones hoy.' }: { title?: string; sub?: string }) {
  return (
    <section style={{ marginTop: 60, padding: '70px 40px', position: 'relative', overflow: 'hidden', background: GRADIENT, textAlign: 'center' }}>
      <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(79,143,255,0.25), transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2rem', color: '#fff', letterSpacing: '-0.02em', marginBottom: 14 }}>{title}</h2>
        <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.55)', marginBottom: 28 }}>{sub}</p>
        <Link to="/register" style={{ background: '#fff', color: '#0f3460', fontFamily: fontHead, fontWeight: 700, padding: '14px 34px', borderRadius: 10, fontSize: '0.95rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'transform 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
        >Comenzar gratis →</Link>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 14 }}>Gratis para siempre · Sin tarjeta · 100% en español</div>
      </div>
    </section>
  );
}

export function PrimaryButton({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} style={{ background: C.blue, color: '#fff', padding: '13px 28px', borderRadius: 10, fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 8px 24px rgba(79,143,255,0.25)', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = '#3d7aee'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = C.blue; e.currentTarget.style.transform = 'none'; }}
    >{children}</Link>
  );
}

export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
            <button onClick={() => setOpen(isOpen ? null : i)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 18px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: "'Space Grotesk', sans-serif" }}>
              <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>{it.q}</span>
              <span style={{ color: C.blue, fontSize: 16, flexShrink: 0, transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.15s' }}>+</span>
            </button>
            {isOpen && <div style={{ padding: '0 18px 16px', fontSize: '0.85rem', color: C.text2, lineHeight: 1.6 }}>{it.a}</div>}
          </div>
        );
      })}
    </div>
  );
}

export function LegalLayout({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px' }}>
      <h1 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2rem', color: '#fff', letterSpacing: '-0.02em', marginBottom: 8 }}>{title}</h1>
      <div style={{ fontSize: '0.78rem', color: C.text3, marginBottom: 32 }}>Última actualización: {updated}</div>
      <div style={{ fontSize: '0.9rem', color: C.text2, lineHeight: 1.75 }}>{children}</div>
    </div>
  );
}

export const legalH2: React.CSSProperties = { fontFamily: fontHead, fontWeight: 700, fontSize: '1.1rem', color: '#fff', marginTop: 32, marginBottom: 10 };
export const legalH3: React.CSSProperties = { fontFamily: fontHead, fontWeight: 700, fontSize: '0.92rem', color: '#e0e0e8', marginTop: 18, marginBottom: 6 };
export const legalP: React.CSSProperties = { marginBottom: 12 };

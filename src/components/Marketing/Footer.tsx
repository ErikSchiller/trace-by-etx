import { Link } from 'react-router-dom';
import { LogoMark } from '../UI/LogoMark';
import { SOCIAL } from '../../config/social';
import { C } from './theme';

type FLink = { label: string; to?: string; href?: string };

const COLS: { title: string; links: FLink[] }[] = [
  {
    title: 'Producto',
    links: [
      { label: 'Funciones', to: '/funciones' },
      { label: 'Brokers', to: '/brokers-soportados' },
      { label: 'Precios', to: '/precios' },
      { label: 'Cambios y novedades', to: '/changelog' },
      { label: 'Roadmap', to: '/roadmap' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { label: 'FAQ', to: '/faq' },
      { label: 'Soporte', href: `mailto:${SOCIAL.email.support}` },
      { label: 'Comunidad Discord', href: SOCIAL.discord },
      { label: 'ETX en TikTok', href: SOCIAL.tiktok },
      { label: 'ETX en YouTube', href: SOCIAL.youtube },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacidad', to: '/privacidad' },
      { label: 'Términos', to: '/terminos' },
      { label: 'Cookies', to: '/cookies' },
      { label: 'Aviso legal', to: '/aviso-legal' },
    ],
  },
];

const linkStyle: React.CSSProperties = { fontSize: '0.78rem', color: C.text2, fontWeight: 500, textDecoration: 'none', transition: 'color 0.12s', display: 'inline-block' };

function FooterLink({ l }: { l: FLink }) {
  const props = {
    style: linkStyle,
    onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = '#fff'),
    onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = C.text2),
  };
  if (l.to) return <Link to={l.to} {...props}>{l.label}</Link>;
  return <a href={l.href} target={l.href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer" {...props}>{l.label}</a>;
}

export function Footer() {
  const socials: { label: string; href: string }[] = [
    { label: 'TikTok', href: SOCIAL.tiktok },
    { label: 'IG', href: SOCIAL.instagram },
    { label: 'YouTube', href: SOCIAL.youtube },
    { label: '𝕏', href: SOCIAL.twitter },
    { label: 'Discord', href: SOCIAL.discord },
  ];
  return (
    <footer style={{ background: C.bg, borderTop: `1px solid ${C.card2}`, padding: '50px 40px 30px' }}>
      <div className="lp-footer-grid" style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 32 }}>
        <div>
          <LogoMark size="md" />
          <p style={{ fontSize: '0.78rem', color: C.text3, marginTop: 14, maxWidth: 280, lineHeight: 1.5 }}>
            El journal de trading más completo en español.
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 16 }}>
            {socials.map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer" title={s.label}
                style={{ fontSize: '0.8rem', color: C.text3, textDecoration: 'none', transition: 'color 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.color = C.blue)}
                onMouseLeave={e => (e.currentTarget.style.color = C.text3)}
              >{s.label}</a>
            ))}
          </div>
        </div>
        {COLS.map(col => (
          <div key={col.title}>
            <div style={{ fontSize: '0.7rem', color: C.text3, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 14 }}>{col.title}</div>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {col.links.map(l => <li key={l.label}><FooterLink l={l} /></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ maxWidth: 1180, margin: '30px auto 0', paddingTop: 20, borderTop: `1px solid ${C.card2}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: '0.72rem', color: C.text3 }}>© 2025 TRACE by ETX. Todos los derechos reservados.</span>
        <span style={{ fontSize: '0.72rem', color: C.text3 }}>Hecho con ☕ desde España</span>
      </div>
      <style>{`@media (max-width: 900px) { .lp-footer-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
    </footer>
  );
}

export default Footer;

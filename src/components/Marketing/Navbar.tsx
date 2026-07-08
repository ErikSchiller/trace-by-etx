import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoMark } from '../UI/LogoMark';
import { SOCIAL } from '../../config/social';
import { C } from './theme';
import { NavDropdown, NavDropdownItem, NavDropdownSectionLabel, NavDropdownDivider } from './NavDropdown';

const PRODUCT_ITEMS = [
  { icon: '📓', title: 'Diario automático',  desc: 'Registra cada operación en segundos', href: '/#diario' },
  { icon: '📊', title: 'Análisis y stats',   desc: 'Win rate, profit factor, drawdown',  href: '/#analisis' },
  { icon: '🎯', title: 'TRACE Score',        desc: 'Tu puntuación global de trader',     href: '/#score' },
  { icon: '📈', title: 'Progress Tracker',   desc: 'Construye consistencia día a día',   href: '/#progress' },
  { icon: '📔', title: 'Notebook',           desc: 'Notas, estrategias y reflexiones',   href: '/#notebook' },
  { icon: '▶',  title: 'Trade Replay',       desc: 'Revive cada operación visualmente',  href: '/#replay' },
];

const RESOURCE_ITEMS = [
  { icon: '🎬', title: 'TikTok @etx',           desc: 'Contenido diario de trading',     href: SOCIAL.tiktok },
  { icon: '📸', title: 'Instagram @etx',        desc: 'Behind the scenes y reflexiones', href: SOCIAL.instagram },
  { icon: '🎥', title: 'YouTube ETX',           desc: 'Análisis profundos y tutoriales', href: SOCIAL.youtube },
  { icon: '💬', title: 'Discord ETX Community', desc: 'Únete a la comunidad',            href: SOCIAL.discord },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  const link: React.CSSProperties = { fontSize: '0.8rem', color: C.text2, textDecoration: 'none', transition: 'color 0.15s', cursor: 'pointer' };

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(10,10,12,0.95)', backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${C.card2}`,
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <LogoMark size="md" showByEtx={false} />
        </Link>

        <div className="lp-nav-center" style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
          {/* Producto dropdown */}
          <NavDropdown label="Producto">
            {PRODUCT_ITEMS.map(it => (
              <NavDropdownItem key={it.title} icon={<span>{it.icon}</span>} title={it.title} description={it.desc} href={it.href} />
            ))}
          </NavDropdown>

          <Link to="/funciones" style={link} onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = C.text2)}>Funciones</Link>
          <Link to="/brokers-soportados" style={link} onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = C.text2)}>Brokers</Link>
          <Link to="/precios" style={link} onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = C.text2)}>Precios</Link>

          {/* Recursos dropdown */}
          <NavDropdown label="Recursos" align="right">
            <NavDropdownSectionLabel>ETX — Mi presencia</NavDropdownSectionLabel>
            {RESOURCE_ITEMS.map(it => (
              <NavDropdownItem key={it.title} icon={<span>{it.icon}</span>} title={it.title} description={it.desc} href={it.href} external />
            ))}
            <NavDropdownDivider />
            <NavDropdownItem icon={<span>📚</span>} title="FAQ" description="Preguntas frecuentes" href="/faq" />
            <NavDropdownItem icon={<span>📧</span>} title="Soporte" description="Contáctanos" href={`mailto:${SOCIAL.email.support}`} external />
          </NavDropdown>
        </div>

        <div className="lp-nav-right" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to="/login" style={link} onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = C.text2)}>Iniciar sesión</Link>
          <Link to="/register" style={{ background: C.blue, color: '#fff', padding: '9px 20px', borderRadius: 8, fontWeight: 600, fontSize: '0.82rem', textDecoration: 'none', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#3d7aee')}
            onMouseLeave={e => (e.currentTarget.style.background = C.blue)}
          >Comenzar gratis →</Link>
        </div>

        <button className="lp-burger" onClick={() => setOpen(o => !o)} style={{ display: 'none', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>☰</button>
      </div>

      {open && (
        <div className="lp-mobile-menu" style={{ background: C.card, borderTop: `1px solid ${C.border}`, padding: 16, display: 'none', flexDirection: 'column', gap: 4 }}>
          <Link to="/funciones" style={{ color: C.text2, textDecoration: 'none', padding: '8px 0' }}>Funciones</Link>
          <Link to="/brokers-soportados" style={{ color: C.text2, textDecoration: 'none', padding: '8px 0' }}>Brokers</Link>
          <Link to="/precios" style={{ color: C.text2, textDecoration: 'none', padding: '8px 0' }}>Precios</Link>
          <Link to="/faq" style={{ color: C.text2, textDecoration: 'none', padding: '8px 0' }}>FAQ</Link>
          <Link to="/login" style={{ color: C.text2, textDecoration: 'none', padding: '8px 0' }}>Iniciar sesión</Link>
          <Link to="/register" style={{ color: C.blue, textDecoration: 'none', padding: '8px 0', fontWeight: 600 }}>Comenzar gratis →</Link>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .lp-nav-center, .lp-nav-right { display: none !important; }
          .lp-burger { display: block !important; }
          .lp-mobile-menu { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}

export default Navbar;

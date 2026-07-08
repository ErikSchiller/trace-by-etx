import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { C } from './theme';

interface NavDropdownProps {
  label: string;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

export function NavDropdown({ label, children, align = 'left' }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpen(true);
  };
  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  // Click-outside + Esc to close
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{ position: 'relative' }}
    >
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center',
          background: 'transparent', border: 'none',
          color: open ? '#fff' : C.text2,
          fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
          padding: '8px 0', fontFamily: "'Space Grotesk', sans-serif",
          transition: 'color 0.12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={e => (e.currentTarget.style.color = open ? '#fff' : C.text2)}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ marginLeft: 4, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s ease' }}>
          <polyline points="2,4 5,7 8,4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: '100%',
            ...(align === 'right' ? { right: 0 } : { left: 0 }),
            paddingTop: 12, // invisible hover bridge
            zIndex: 100,
          }}
        >
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: 14,
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)', minWidth: 320,
            animation: 'navDropdownFadeIn 0.15s ease',
          }}>
            {children}
          </div>
        </div>
      )}

      <style>{`
        @keyframes navDropdownFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

interface NavDropdownItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  external?: boolean;
}

export function NavDropdownItem({ icon, title, description, href, external }: NavDropdownItemProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    if (external) return; // let browser handle new-tab / mailto
    e.preventDefault();
    if (href.startsWith('/#')) {
      const id = href.replace('/#', '');
      if (window.location.pathname !== '/') {
        window.location.href = href;
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(href);
    }
  };

  return (
    <a
      href={href}
      role="menuitem"
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={handleClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '10px 12px', borderRadius: 8,
        textDecoration: 'none', color: 'inherit', cursor: 'pointer',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(79,143,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.text, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: '0.72rem', color: C.text2, lineHeight: 1.4 }}>{description}</div>
      </div>
    </a>
  );
}

export function NavDropdownSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.6rem', fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 12px 8px' }}>
      {children}
    </div>
  );
}

export function NavDropdownDivider() {
  return <div style={{ height: 1, background: C.border, margin: '8px 0' }} />;
}

export default NavDropdown;

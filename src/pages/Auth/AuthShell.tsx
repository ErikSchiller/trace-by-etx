import { Link } from 'react-router-dom';
import { LogoMark } from '../../components/UI/LogoMark';

interface AuthShellProps {
  children: React.ReactNode;
  tagline?: string;
}

export function AuthShell({ children, tagline = 'El journal de trading más completo en español' }: AuthShellProps) {
  return (
    <div
      className="fade-in"
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#e0e0e8',
        fontFamily: "'Space Grotesk', sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="auth-shell-grid"
        style={{
          width: '100%',
          maxWidth: 900,
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid #1e1e20',
          display: 'grid',
          gridTemplateColumns: '45% 55%',
          minHeight: 560,
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* LEFT — brand panel */}
        <div
          className="auth-shell-brand"
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 36px',
            overflow: 'hidden',
          }}
        >
          {/* Subtle radial glow */}
          <div
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: 420, height: 420,
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(79,143,255,0.15), transparent 65%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative', textAlign: 'center', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
            <LogoMark size="lg" />
            <p
              style={{
                marginTop: 28,
                fontSize: '0.78rem',
                color: 'rgba(255,255,255,0.35)',
                lineHeight: 1.6,
                maxWidth: 220,
                marginInline: 'auto',
              }}
            >
              {tagline}
            </p>
          </div>
        </div>

        {/* RIGHT — form panel */}
        <div
          className="auth-shell-form"
          style={{
            background: '#111113',
            padding: '48px 44px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {children}
          <Link
            to="/"
            style={{
              marginTop: 14,
              fontSize: '0.72rem',
              color: '#33334a',
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
      <style>{`
        @media (max-width: 600px) {
          .auth-shell-grid { grid-template-columns: 1fr !important; min-height: 0 !important; }
          .auth-shell-brand { display: none !important; }
          .auth-shell-form { padding: 24px !important; }
        }
      `}</style>
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#161618',
  border: '1px solid #1e1e20',
  padding: '11px 14px',
  borderRadius: 8,
  color: '#e0e0e8',
  fontSize: '0.85rem',
  fontFamily: "'Space Grotesk', sans-serif",
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

export const labelStyle: React.CSSProperties = {
  fontSize: '0.62rem',
  color: '#4a4a60',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
  marginBottom: 6,
  display: 'block',
};

export const ctaStyle: React.CSSProperties = {
  width: '100%',
  background: '#4f8fff',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: 12,
  fontSize: '0.88rem',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: "'Space Grotesk', sans-serif",
  letterSpacing: '0.01em',
  marginTop: 24,
  transition: 'background 0.15s ease, transform 0.1s ease',
};

export const errorBoxStyle: React.CSSProperties = {
  background: 'rgba(239,68,68,0.08)',
  border: '1px solid rgba(239,68,68,0.2)',
  borderRadius: 7,
  padding: '10px 14px',
  color: '#ef4444',
  fontSize: '0.78rem',
  marginTop: 16,
};

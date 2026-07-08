import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Página no encontrada');
  const isAuth = useAuthStore(s => s.isAuthenticated);
  const dashHref = isAuth ? '/dashboard' : '/login';

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0c', color: '#e0e0e8',
      fontFamily: "'Space Grotesk', sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, textAlign: 'center', position: 'relative',
    }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '8rem', color: 'rgba(79,143,255,0.1)', lineHeight: 1 }}>404</div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: '#fff', marginTop: 8, marginBottom: 10 }}>
        Esta página no existe
      </h1>
      <p style={{ fontSize: '0.92rem', color: '#888898', marginBottom: 28 }}>
        Quizás escribiste mal la URL, o la página fue movida.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/" style={{ background: 'transparent', border: '1px solid #1e1e20', color: '#e0e0e8', borderRadius: 9, padding: '12px 24px', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none' }}>← Volver al inicio</Link>
        <Link to={dashHref} style={{ background: '#4f8fff', color: '#fff', borderRadius: 9, padding: '12px 24px', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none' }}>Ir al dashboard →</Link>
      </div>
    </div>
  );
}

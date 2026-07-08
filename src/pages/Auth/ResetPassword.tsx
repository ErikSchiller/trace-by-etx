import { AuthShell } from './AuthShell';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import { SOCIAL } from '../../config/social';

export default function ResetPassword() {
  usePageTitle('Recuperar contraseña');
  return (
    <AuthShell tagline="Recupera el acceso a tu cuenta.">
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.4rem', color: '#fff', marginBottom: 6 }}>
        Recuperar contraseña
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#888898', lineHeight: 1.6, marginBottom: 24 }}>
        La recuperación automática estará disponible próximamente. Mientras tanto, escríbenos a{' '}
        <a href={`mailto:${SOCIAL.email.support}`} style={{ color: '#4f8fff', textDecoration: 'none' }}>{SOCIAL.email.support}</a>{' '}
        y te ayudaremos a recuperar el acceso.
      </p>
      <Link to="/login" style={{ fontSize: '0.82rem', color: '#4f8fff', textDecoration: 'none', fontWeight: 600 }}>← Volver a iniciar sesión</Link>
    </AuthShell>
  );
}

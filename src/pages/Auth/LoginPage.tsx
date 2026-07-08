import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/UI/ToastProvider';
import { usePageTitle } from '../../hooks/usePageTitle';
import { AuthShell, inputStyle, labelStyle, ctaStyle, errorBoxStyle } from './AuthShell';

export default function LoginPage() {
  usePageTitle('Iniciar sesión');
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();
  const { push } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      push({ kind: 'success', text: 'Sesión iniciada' });
      navigate(user.onboardingComplete ? '/dashboard' : '/onboarding');
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell tagline="El journal de trading más completo en español">
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.4rem', color: '#fff', marginBottom: 6, letterSpacing: '-0.01em' }}>
        Bienvenido de vuelta
      </h1>
      <p style={{ fontSize: '0.82rem', color: '#4a4a60', marginBottom: 28 }}>
        Inicia sesión para acceder a tu cuenta.
      </p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com" style={inputStyle}
            autoComplete="email" required
          />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <label style={labelStyle}>Contraseña</label>
            <Link to="/reset-password" style={{ fontSize: '0.7rem', color: '#4a4a60', textDecoration: 'none' }}>¿Olvidaste tu contraseña?</Link>
          </div>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" style={inputStyle}
            autoComplete="current-password" required
          />
        </div>

        {err && <div style={errorBoxStyle}>{err}</div>}

        <button
          type="submit" disabled={loading}
          style={{ ...ctaStyle, opacity: loading ? 0.6 : 1 }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#3d7aee'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
          onMouseLeave={e => { e.currentTarget.style.background = '#4f8fff'; e.currentTarget.style.transform = 'none'; }}
        >
          {loading ? 'Iniciando…' : 'Iniciar sesión'}
        </button>
      </form>

      <div style={{ marginTop: 20, fontSize: '0.78rem', color: '#4a4a60', textAlign: 'center' }}>
        ¿No tienes cuenta?{' '}
        <Link to="/register" style={{ color: '#4f8fff', textDecoration: 'none', fontWeight: 600 }}>
          Comenzar gratis →
        </Link>
      </div>
    </AuthShell>
  );
}

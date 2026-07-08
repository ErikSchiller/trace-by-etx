import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/UI/ToastProvider';
import { usePageTitle } from '../../hooks/usePageTitle';
import { AuthShell, inputStyle, labelStyle, ctaStyle, errorBoxStyle } from './AuthShell';

export default function RegisterPage() {
  usePageTitle('Crear cuenta');
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const register = useAuthStore(s => s.register);
  const navigate = useNavigate();
  const { push } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Introduce tu nombre';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email inválido';
    if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (password !== confirm) e.confirm = 'Las contraseñas no coinciden';
    return e;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    setLoading(true);
    try {
      await register(name, email, password);
      push({ kind: 'success', text: 'Cuenta creada' });
      navigate('/onboarding');
    } catch (ex) {
      setErrors({ form: ex instanceof Error ? ex.message : 'Error desconocido' });
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (k: string) => errors[k] && (
    <div style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: 4 }}>{errors[k]}</div>
  );

  return (
    <AuthShell tagline="Crea tu cuenta y empieza a mejorar hoy.">
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.4rem', color: '#fff', marginBottom: 6, letterSpacing: '-0.01em' }}>
        Crear cuenta gratis
      </h1>
      <p style={{ fontSize: '0.82rem', color: '#4a4a60', marginBottom: 28 }}>
        Únete a miles de traders que ya usan TRACE.
      </p>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>Nombre completo</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Erik H." style={inputStyle} autoComplete="name" />
          {fieldError('name')}
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" style={inputStyle} autoComplete="email" />
          {fieldError('email')}
        </div>
        <div>
          <label style={labelStyle}>Contraseña</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" style={inputStyle} autoComplete="new-password" />
          {fieldError('password')}
        </div>
        <div>
          <label style={labelStyle}>Confirmar contraseña</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repite tu contraseña" style={inputStyle} autoComplete="new-password" />
          {fieldError('confirm')}
        </div>

        {errors.form && <div style={errorBoxStyle}>{errors.form}</div>}

        <button
          type="submit" disabled={loading}
          style={{ ...ctaStyle, opacity: loading ? 0.6 : 1 }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#3d7aee'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
          onMouseLeave={e => { e.currentTarget.style.background = '#4f8fff'; e.currentTarget.style.transform = 'none'; }}
        >
          {loading ? 'Creando…' : 'Crear mi cuenta →'}
        </button>
      </form>

      <div style={{ marginTop: 20, fontSize: '0.78rem', color: '#4a4a60', textAlign: 'center' }}>
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" style={{ color: '#4f8fff', textDecoration: 'none', fontWeight: 600 }}>
          Iniciar sesión
        </Link>
      </div>
    </AuthShell>
  );
}

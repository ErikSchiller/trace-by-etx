import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useUpgradeModal } from '../../store/upgradeModalStore';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../UI/ToastProvider';
import { LogoMark } from '../UI/LogoMark';

const FEATURES = [
  'Operaciones ilimitadas',
  'Analíticas avanzadas completas',
  'Conexión con brokers',
  'Color de acento personalizable',
  'Múltiples cuentas',
  'Notebook ilimitado',
  'Exportación CSV y JSON',
  'Prop Firm Hub completo',
  'Simulador Monte Carlo',
  'Heatmap de mejores horarios',
  'TRACE IA — sin coste extra cuando salga (Q1)',
];

export function UpgradeModal() {
  const { isOpen, message, close } = useUpgradeModal();
  const upgrade = useAuthStore(s => s.upgradeToPro);
  const { push } = useToast();
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('annual');

  if (!isOpen) return null;

  const onUpgrade = () => {
    upgrade(cycle);
    push({ kind: 'success', text: '¡Bienvenido a Plan Pro! 🎉' });
    close();
  };

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 780,
          borderRadius: 16, overflow: 'hidden',
          border: '1px solid #1e1e20',
          display: 'grid', gridTemplateColumns: '45% 55%',
          fontFamily: "'Space Grotesk', sans-serif",
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* LEFT — gradient */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
            padding: '40px 36px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20,
            position: 'relative',
          }}
        >
          <LogoMark size="lg" />
          <span style={{
            background: 'rgba(79,143,255,0.2)', border: '1px solid rgba(79,143,255,0.3)',
            color: '#6b9fff', fontSize: 12, padding: '5px 12px', borderRadius: 20,
            width: 'fit-content', fontWeight: 600, letterSpacing: '0.04em',
          }}>Plan Pro</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FEATURES.map(f => {
              const isAi = f.includes('TRACE IA');
              return (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isAi ? <span style={{ fontSize: 13, width: 14, textAlign: 'center' }}>🧠</span> : <Check size={14} color="#4f8fff" strokeWidth={2.5} />}
                  <span style={{ fontSize: 13, color: isAi ? '#a99bff' : 'rgba(255,255,255,0.8)', fontWeight: isAi ? 600 : 400 }}>{f}</span>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginTop: 4 }}>
            Al suscribirte hoy, tendrás TRACE IA incluida en cuanto se publique. Sin subida de precio.
          </div>
        </div>

        {/* RIGHT — pricing */}
        <div style={{
          background: '#111113', padding: '40px 36px',
          display: 'flex', flexDirection: 'column', position: 'relative',
        }}>
          <button
            onClick={close}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'transparent', border: 'none', color: '#3a3a55', cursor: 'pointer',
            }}
          ><X size={18} /></button>

          <h2 style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.3rem',
            color: '#fff', letterSpacing: '-0.02em', marginBottom: 6,
          }}>Desbloquea todo con Pro</h2>
          <p style={{ fontSize: 14, color: '#4a4a60', marginBottom: 24 }}>
            Lleva tu trading al siguiente nivel.
          </p>

          {message && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 7, padding: '8px 12px', color: '#ef4444',
              fontSize: 12, marginBottom: 16,
            }}>{message}</div>
          )}

          {/* Billing toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'inline-flex', background: '#161618', border: '1px solid #1e1e20',
              borderRadius: 20, padding: 3, gap: 2,
            }}>
              {(['monthly', 'annual'] as const).map(c => {
                const active = cycle === c;
                return (
                  <button
                    key={c} onClick={() => setCycle(c)}
                    style={{
                      background: active ? '#1e1e28' : 'transparent',
                      border: active ? '1px solid #2a2a35' : '1px solid transparent',
                      color: active ? '#fff' : '#4a4a60',
                      borderRadius: 16, padding: '5px 14px',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {c === 'monthly' ? 'Mensual' : 'Anual'}
                    </span>
                  </button>
                );
              })}
            </div>
            {cycle === 'annual' && (
              <span style={{
                background: 'rgba(79,143,255,0.1)', color: '#4f8fff',
                fontSize: 11, padding: '2px 7px', borderRadius: 8, fontWeight: 600,
              }}>Ahorra 34%</span>
            )}
          </div>

          {/* Price */}
          <div style={{ margin: '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="syne" style={{
                fontFamily: "'Syne', sans-serif", fontWeight: 800,
                fontSize: '2.4rem', color: '#fff', lineHeight: 1, letterSpacing: '-0.02em',
                fontFeatureSettings: '"tnum"',
              }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}>€{cycle === 'annual' ? 19 : 29}</span>
              </span>
              <span style={{ fontSize: 16, color: '#4a4a60', fontFamily: "'Space Grotesk', sans-serif" }}>/mes</span>
            </div>
            <div style={{ fontSize: 12, color: '#4a4a60', marginTop: 3, fontFamily: "'Space Grotesk', sans-serif" }}>
              {cycle === 'annual' ? 'facturado €228/año' : 'sin compromiso anual'}
            </div>
          </div>

          <button
            onClick={onUpgrade}
            style={{
              background: '#4f8fff', color: '#fff', border: 'none',
              width: '100%', padding: 13, borderRadius: 8,
              fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer',
              transition: 'background 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#3d7aee'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#4f8fff'; e.currentTarget.style.transform = 'none'; }}
          >
            Actualizar a Pro →
          </button>
          <div style={{ fontSize: 12, color: '#33334a', textAlign: 'center', marginTop: 12 }}>
            Sin permanencia · Cancela cuando quieras
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;

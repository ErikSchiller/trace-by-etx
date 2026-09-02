import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUpgradeModal } from '../../store/upgradeModalStore';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../UI/ToastProvider';
import { LogoMark } from '../UI/LogoMark';
import { PLANS } from '../../config/plans';

const INDIGO = '#7861ff';

const PREVIEW = [
  'Operaciones ilimitadas',
  'Analíticas avanzadas completas',
  'Trade Replay y brokers',
  'Notebook y multi-cuenta',
  'Todos los PnL Cards',
  'TRACE IA — incluida (Q1) con Pro AI',
];
const PRO_KEY = ['Operaciones ilimitadas', 'Analíticas completas', 'Trade Replay', 'Todos los PnL Cards'];
const PROAI_KEY = ['Todo lo de Pro', '🧠 TRACE IA (Q1)', '🎲 Simulador Monte Carlo', '🌐 Perfil público'];

export function UpgradeModal() {
  const { isOpen, message, close } = useUpgradeModal();
  const upgrade = useAuthStore(s => s.upgradeToTier);
  const { push } = useToast();
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('annual');

  if (!isOpen) return null;

  const onUpgrade = (tier: 'pro' | 'pro_ai') => {
    upgrade(tier, cycle);
    push({ kind: 'success', text: `¡Bienvenido a Plan ${PLANS[tier].name}! 🎉` });
    close();
  };
  const priceOf = (tier: 'pro' | 'pro_ai') => cycle === 'annual' ? PLANS[tier].yearlyPrice : PLANS[tier].monthlyPrice;
  const billOf = (tier: 'pro' | 'pro_ai') => cycle === 'annual' ? `Facturado €${PLANS[tier].yearlyTotal}/año` : 'Sin permanencia';

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="upgrade-modal" style={{ width: '100%', maxWidth: 900, borderRadius: 16, overflow: 'hidden', border: '1px solid #1e1e20', display: 'grid', gridTemplateColumns: '35% 65%', fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
        {/* LEFT — gradient */}
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)', padding: '40px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
          <LogoMark size="lg" />
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>Desbloquea TRACE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PREVIEW.map(f => {
              const isAi = f.includes('TRACE IA');
              return (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isAi ? <span style={{ fontSize: 13, width: 14, textAlign: 'center' }}>🧠</span> : <Check size={14} color="#4f8fff" strokeWidth={2.5} />}
                  <span style={{ fontSize: 12.5, color: isAi ? '#a99bff' : 'rgba(255,255,255,0.8)', fontWeight: isAi ? 600 : 400 }}>{f}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — two tiers */}
        <div style={{ background: '#111113', padding: '32px 30px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <button onClick={close} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: '#3a3a55', cursor: 'pointer' }}><X size={18} /></button>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.3rem', color: '#fff', marginBottom: 4 }}>Elige tu plan</h2>
          {message && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '8px 12px', color: '#ef4444', fontSize: 12, margin: '10px 0 4px' }}>{message}</div>}

          {/* Billing toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0' }}>
            <div style={{ display: 'inline-flex', background: '#161618', border: '1px solid #1e1e20', borderRadius: 20, padding: 3, gap: 2 }}>
              {(['monthly', 'annual'] as const).map(c => (
                <button key={c} onClick={() => setCycle(c)} style={{ background: cycle === c ? '#1e1e28' : 'transparent', border: cycle === c ? '1px solid #2a2a35' : '1px solid transparent', color: cycle === c ? '#fff' : '#4a4a60', borderRadius: 16, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>{c === 'monthly' ? 'Mensual' : 'Anual'}</button>
              ))}
            </div>
            {cycle === 'annual' && <span style={{ background: 'rgba(79,143,255,0.1)', color: '#4f8fff', fontSize: 11, padding: '2px 7px', borderRadius: 8, fontWeight: 600 }}>Ahorra 34%</span>}
          </div>

          {/* Tier cards */}
          <div className="upgrade-tiers" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* PRO */}
            <div style={{ border: '1px solid rgba(79,143,255,0.4)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: '#4f8fff' }}>Pro</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '8px 0 2px' }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.7rem', color: '#fff' }}>€{priceOf('pro')}</span>
                <span style={{ fontSize: 12, color: '#4a4a60' }}>/mes</span>
              </div>
              <div style={{ fontSize: 10.5, color: '#4a4a60', marginBottom: 12 }}>{billOf('pro')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14, flex: 1 }}>
                {PRO_KEY.map(f => <div key={f} style={{ fontSize: 12, color: '#c8d4e8', display: 'flex', gap: 7 }}><span style={{ color: '#4f8fff' }}>✓</span>{f}</div>)}
              </div>
              <button onClick={() => onUpgrade('pro')} style={{ background: '#4f8fff', color: '#fff', border: 'none', width: '100%', padding: 10, borderRadius: 8, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Elegir Pro</button>
            </div>

            {/* PRO AI */}
            <div style={{ position: 'relative', border: `2px solid ${INDIGO}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', background: 'linear-gradient(160deg, rgba(120,97,255,0.08), transparent 60%)' }}>
              <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', background: INDIGO, color: '#fff', fontSize: 9, padding: '2px 10px', borderRadius: '0 0 7px 7px', fontWeight: 700, letterSpacing: '0.05em' }}>MÁS POPULAR</span>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: INDIGO, marginTop: 6 }}>Pro AI</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '8px 0 2px' }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.7rem', color: '#fff' }}>€{priceOf('pro_ai')}</span>
                <span style={{ fontSize: 12, color: '#4a4a60' }}>/mes</span>
              </div>
              <div style={{ fontSize: 10.5, color: '#4a4a60', marginBottom: 12 }}>{billOf('pro_ai')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14, flex: 1 }}>
                {PROAI_KEY.map(f => <div key={f} style={{ fontSize: 12, color: '#c8d4e8', display: 'flex', gap: 7 }}><span style={{ color: INDIGO }}>✦</span>{f}</div>)}
              </div>
              <button onClick={() => onUpgrade('pro_ai')} style={{ background: INDIGO, color: '#fff', border: 'none', width: '100%', padding: 10, borderRadius: 8, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Elegir Pro AI</button>
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#4a4a60', textAlign: 'center', marginTop: 16 }}>
            ¿Interesado en la oferta Fundador? <Link to="/precios#founder" onClick={close} style={{ color: INDIGO, textDecoration: 'none', fontWeight: 600 }}>Ver más →</Link>
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 720px){ .upgrade-modal{ grid-template-columns: 1fr !important; } .upgrade-tiers{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

export default UpgradeModal;

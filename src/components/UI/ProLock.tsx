import { Lock } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';
import { useUpgradeModal } from '../../store/upgradeModalStore';

interface ProLockProps {
  feature: string;
  description?: string;
  children: React.ReactNode;
}

export function ProLock({ feature, description, children }: ProLockProps) {
  const { isPro } = usePlan();
  const open = useUpgradeModal(s => s.open);

  if (isPro) return <>{children}</>;

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ filter: 'blur(3px)', pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(17,17,19,0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
      >
        <div style={{
          background: '#161618', border: '1px solid #1e1e20',
          borderRadius: 12, padding: '20px 24px',
          textAlign: 'center', maxWidth: 260,
          fontFamily: "'Space Grotesk', sans-serif",
        }}>
          <Lock size={28} color="#3a3a55" strokeWidth={1.6} />
          <div style={{
            display: 'inline-block',
            background: 'rgba(79,143,255,0.1)', color: '#4f8fff',
            fontSize: 11, padding: '3px 8px', borderRadius: 8,
            margin: '8px 0', fontWeight: 600, letterSpacing: '0.04em',
          }}>Plan Pro</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e0e0e8' }}>{feature}</div>
          {description && (
            <div style={{ fontSize: 12, color: '#4a4a60', marginTop: 4, lineHeight: 1.5 }}>{description}</div>
          )}
          <button
            onClick={() => open()}
            style={{
              background: '#4f8fff', color: '#fff', border: 'none',
              borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600,
              marginTop: 14, width: '100%', cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#3d7aee')}
            onMouseLeave={e => (e.currentTarget.style.background = '#4f8fff')}
          >Ver planes →</button>
        </div>
      </div>
    </div>
  );
}

export default ProLock;

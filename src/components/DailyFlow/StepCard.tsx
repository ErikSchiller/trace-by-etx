import type { LucideIcon } from 'lucide-react';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
export const DF = {
  card: '#111113', border: '#1e2029', blue: '#4f8fff', red: '#ef4444', indigo: 'rgba(120,97,255,0.45)',
  text: '#f7f8fa', text2: '#d0d0dc', muted: '#6b7382', faint: '#4a4a60', tint: 'rgba(79,143,255,0.15)',
};

export type StepState = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export function StepCard({ number, title, description, Icon, state, statusText, isNext, onOpen, onSkip }: {
  number: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  state: StepState;
  statusText: string;
  isNext: boolean;
  onOpen: () => void;
  onSkip?: () => void;
}) {
  const statusColor = state === 'completed' ? DF.blue : state === 'in_progress' ? DF.text : DF.muted;
  const btn: Record<StepState, { label: string; style: React.CSSProperties }> = {
    not_started: { label: 'Empezar →', style: { background: DF.blue, color: '#fff', border: `1px solid ${DF.blue}` } },
    in_progress: { label: 'Continuar →', style: { background: 'transparent', color: DF.blue, border: `1px solid rgba(79,143,255,0.5)` } },
    completed: { label: 'Ver →', style: { background: 'transparent', color: DF.text2, border: `1px solid ${DF.border}` } },
    skipped: { label: 'Hacer ahora', style: { background: 'transparent', color: DF.text2, border: `1px solid ${DF.border}` } },
  };

  return (
    <div className="df-step-card" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onOpen(); }}
      style={{ position: 'relative', background: DF.card, border: `1px solid ${DF.border}`, borderRadius: 12, padding: '24px 28px', minHeight: 140, cursor: 'pointer', transition: 'all 150ms', display: 'flex', gap: 20, alignItems: 'center', fontFamily: fontBody }}>
      {isNext && <span className="df-next-badge" style={{ position: 'absolute', top: 14, right: 14, background: DF.blue, color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em' }}>SIGUIENTE</span>}

      <div style={{ width: 56, height: 56, borderRadius: 12, background: DF.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={24} color="#fff" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.65rem', color: DF.muted, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 2 }}>{number}</div>
        <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1.1rem', color: DF.text }}>{title}</div>
        <div style={{ fontSize: '0.82rem', color: DF.muted, lineHeight: 1.5, marginTop: 4 }}>{description}</div>
        <div style={{ fontSize: '0.78rem', color: statusColor, marginTop: 8, textDecoration: state === 'skipped' ? 'line-through' : 'none' }}>{statusText}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0, alignSelf: 'flex-end' }}>
        <button onClick={e => { e.stopPropagation(); onOpen(); }} style={{ ...btn[state].style, borderRadius: 9, padding: '9px 16px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody, whiteSpace: 'nowrap' }}>{btn[state].label}</button>
        {onSkip && state === 'not_started' && (
          <button onClick={e => { e.stopPropagation(); onSkip(); }} style={{ background: 'transparent', border: 'none', color: DF.muted, fontSize: '0.74rem', cursor: 'pointer', fontFamily: fontBody, padding: 0, textDecoration: 'underline' }}>Saltar hoy</button>
        )}
      </div>
    </div>
  );
}

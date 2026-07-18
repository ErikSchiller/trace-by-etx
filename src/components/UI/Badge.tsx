import type { ReactNode, CSSProperties } from 'react';

export type BadgeVariant =
  | 'ganancia' | 'perdida' | 'breakEven' | 'pendiente' | 'importante' | 'neutral' | 'pro' | 'new'
  // legacy aliases (dead component tree) — kept so the build stays green
  | 'green' | 'red' | 'blue' | 'yellow' | 'gray' | 'orange';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  style?: CSSProperties;
}

const STYLES: Record<BadgeVariant, CSSProperties> = {
  ganancia:   { background: 'rgba(79,143,255,0.10)', color: 'var(--blue)' },
  perdida:    { background: 'rgba(239,68,68,0.10)', color: 'var(--red)' },
  breakEven:  { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' },
  pendiente:  { background: 'rgba(245,185,66,0.12)', color: 'var(--warning)' },
  importante: { background: 'rgba(120,97,255,0.10)', color: 'var(--indigo)' },
  neutral:    { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' },
  pro:        { background: 'rgba(120,97,255,0.10)', color: 'var(--indigo)' },
  new:        { background: 'rgba(120,97,255,0.12)', color: 'var(--indigo)', letterSpacing: '0.08em' },
  // legacy aliases
  green:  { background: 'rgba(79,143,255,0.10)', color: 'var(--blue)' },
  red:    { background: 'rgba(239,68,68,0.10)', color: 'var(--red)' },
  blue:   { background: 'rgba(79,143,255,0.10)', color: 'var(--blue)' },
  yellow: { background: 'rgba(245,185,66,0.12)', color: 'var(--warning)' },
  gray:   { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' },
  orange: { background: 'rgba(245,185,66,0.12)', color: 'var(--warning)' },
};

export function Badge({ children, variant = 'neutral', className, style }: BadgeProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
        fontSize: '0.68rem', padding: '3px 8px', borderRadius: 6,
        lineHeight: 1.3, whiteSpace: 'nowrap',
        ...STYLES[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export default Badge;

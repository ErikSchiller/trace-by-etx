import { type ReactNode, type ButtonHTMLAttributes, type CSSProperties } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  /** Legacy escape hatch; still applied if provided. */
  className?: string;
}

const fontBody = "'Space Grotesk', sans-serif";

const SIZE: Record<ButtonSize, CSSProperties> = {
  sm: { height: 28, padding: '0 12px', fontSize: '0.76rem', borderRadius: 7 },
  md: { height: 36, padding: '0 16px', fontSize: '0.85rem', borderRadius: 8 },
  lg: { height: 44, padding: '0 22px', fontSize: '0.92rem', borderRadius: 9 },
};

const VARIANT: Record<ButtonVariant, CSSProperties> = {
  primary:   { background: 'var(--blue)', color: '#fff', border: '1px solid transparent', boxShadow: '0 4px 16px rgba(79,143,255,0.25)' },
  secondary: { background: 'var(--card-2)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
  outline:   { background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)' },
  ghost:     { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid transparent' },
  danger:    { background: 'var(--danger)', color: '#fff', border: '1px solid transparent' },
};

export function Button({
  children, variant = 'secondary', size = 'md',
  loading = false, disabled, iconLeft, iconRight, fullWidth,
  className, style, ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...props}
      className={className}
      disabled={isDisabled}
      data-variant={variant}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: fontBody, fontWeight: 600, lineHeight: 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        width: fullWidth ? '100%' : undefined,
        transition: 'background 0.15s, transform 0.1s, box-shadow 0.15s, border-color 0.15s',
        ...SIZE[size],
        ...VARIANT[variant],
        ...style,
      }}
    >
      {loading ? <Spinner /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'traceSpin 0.7s linear infinite' }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <style>{`@keyframes traceSpin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

export default Button;

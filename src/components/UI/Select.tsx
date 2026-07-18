import { type SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, fullWidth = true, style, children, ...props }, ref,
) {
  return (
    <div style={{ width: fullWidth ? '100%' : undefined }}>
      {label && (
        <label style={{
          display: 'block', marginBottom: 6, fontSize: '0.62rem', fontWeight: 600,
          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>{label}</label>
      )}
      <div style={{ position: 'relative' }}>
        <select
          ref={ref}
          {...props}
          className="ui-input"
          data-error={error ? 'true' : undefined}
          style={{
            width: '100%', boxSizing: 'border-box', appearance: 'none', WebkitAppearance: 'none',
            background: 'var(--card)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border-subtle)'}`,
            borderRadius: 8, padding: '10px 34px 10px 14px',
            color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '0.9rem', outline: 'none', cursor: 'pointer',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            ...style,
          }}
        >
          {children}
        </select>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <polyline points="3,4.5 6,8 9,4.5" stroke="var(--text-tertiary)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {error && <div style={{ color: 'var(--danger)', fontSize: '0.7rem', marginTop: 4 }}>{error}</div>}
    </div>
  );
});

export default Select;

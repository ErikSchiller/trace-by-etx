import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, fullWidth = true, style, ...props }, ref,
) {
  return (
    <div style={{ width: fullWidth ? '100%' : undefined }}>
      {label && (
        <label style={{
          display: 'block', marginBottom: 6, fontSize: '0.62rem', fontWeight: 600,
          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>{label}</label>
      )}
      <input
        ref={ref}
        {...props}
        className="ui-input"
        data-error={error ? 'true' : undefined}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--card)',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border-subtle)'}`,
          borderRadius: 8, padding: '10px 14px',
          color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '0.9rem', outline: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          ...style,
        }}
      />
      {error && <div style={{ color: 'var(--danger)', fontSize: '0.7rem', marginTop: 4 }}>{error}</div>}
    </div>
  );
});

export default Input;

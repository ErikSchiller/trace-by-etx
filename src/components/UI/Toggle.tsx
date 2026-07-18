interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}

/** iOS-style switch, blue when on. 32x18px. */
export function Toggle({ checked, onChange, disabled, ...aria }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={aria['aria-label']}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 32, height: 18, borderRadius: 9, border: 'none', flexShrink: 0,
        position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked ? 'var(--blue)' : 'var(--border)',
        opacity: disabled ? 0.5 : 1, transition: 'background 0.15s', padding: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 16 : 2,
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

export default Toggle;

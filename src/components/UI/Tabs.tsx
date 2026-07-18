import type { ReactNode } from 'react';

export interface TabItem<T extends string = string> {
  value: T;
  label: ReactNode;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Underline-style tabs (brand guide). */
export function Tabs<T extends string>({ items, value, onChange }: TabsProps<T>) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
      {items.map(item => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            style={{
              padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.82rem', fontWeight: active ? 600 : 500,
              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: `2px solid ${active ? 'var(--blue)' : 'transparent'}`,
              marginBottom: -1, transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;

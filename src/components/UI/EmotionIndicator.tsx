import { clsx } from 'clsx';
import type { EmotionalState } from '../../types';

interface EmotionIndicatorProps {
  value: EmotionalState;
  size?: 'sm' | 'md';
}

const labels: Record<EmotionalState, string> = {
  1: 'Muy calmado',
  2: 'Calmado',
  3: 'Neutral',
  4: 'Nervioso',
  5: 'Ansioso',
};

const colors: Record<EmotionalState, string> = {
  1: 'text-[#00d4aa]',
  2: 'text-[#4dabf7]',
  3: 'text-[#ffd43b]',
  4: 'text-[#ff8c00]',
  5: 'text-[#ff4757]',
};

export function EmotionIndicator({ value, size = 'sm' }: EmotionIndicatorProps) {
  return (
    <span className={clsx('font-mono', colors[value], size === 'sm' ? 'text-xs' : 'text-sm')}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={clsx(i < value ? colors[value] : 'text-[#2a2a3d]')}>●</span>
      ))}
      <span className="ml-1 text-[#8888aa]">{labels[value]}</span>
    </span>
  );
}

interface EmotionPickerProps {
  value: EmotionalState;
  onChange: (v: EmotionalState) => void;
  label?: string;
}

export function EmotionPicker({ value, onChange, label }: EmotionPickerProps) {
  const options: EmotionalState[] = [1, 2, 3, 4, 5];
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs text-[#8888aa]">{label}</label>}
      <div className="flex gap-2">
        {options.map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={clsx(
              'w-8 h-8 rounded-md text-sm font-mono transition-all border',
              value === v
                ? `${colors[v]} border-current bg-current/10`
                : 'text-[#55557a] border-[#1e1e2e] hover:border-[#2a2a3d]'
            )}
          >
            {v}
          </button>
        ))}
      </div>
      <span className={clsx('text-xs', colors[value])}>{labels[value]}</span>
    </div>
  );
}

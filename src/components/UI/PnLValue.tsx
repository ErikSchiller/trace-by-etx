import { clsx } from 'clsx';

interface PnLValueProps {
  value: number;
  symbol?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
  xl: 'text-2xl font-bold',
};

export function PnLValue({ value, symbol = '$', className, size = 'md' }: PnLValueProps) {
  const isPos = value > 0;
  const isNeg = value < 0;
  const abs = Math.abs(value);
  const formatted = abs >= 1000 ? `${(abs / 1000).toFixed(2)}k` : abs.toFixed(2);

  return (
    <span
      className={clsx(
        'font-mono font-medium',
        isPos && 'text-[#00d4aa]',
        isNeg && 'text-[#ff4757]',
        !isPos && !isNeg && 'text-[#8888aa]',
        sizes[size],
        className
      )}
    >
      {isNeg ? '-' : isPos ? '+' : ''}{symbol}{formatted}
    </span>
  );
}

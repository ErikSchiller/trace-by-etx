import type { ReactNode } from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'green' | 'red' | 'blue' | 'yellow' | 'gray' | 'orange';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  green:  'bg-[rgba(0,212,170,0.15)] text-[#00d4aa] border border-[rgba(0,212,170,0.3)]',
  red:    'bg-[rgba(255,71,87,0.15)]  text-[#ff4757] border border-[rgba(255,71,87,0.3)]',
  blue:   'bg-[rgba(77,171,247,0.15)] text-[#4dabf7] border border-[rgba(77,171,247,0.3)]',
  yellow: 'bg-[rgba(255,212,59,0.15)] text-[#ffd43b] border border-[rgba(255,212,59,0.3)]',
  orange: 'bg-[rgba(255,140,0,0.15)]  text-[#ff8c00] border border-[rgba(255,140,0,0.3)]',
  gray:   'bg-[#1e1e2e] text-[#8888aa] border border-[#2a2a3d]',
};

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono', variants[variant], className)}>
      {children}
    </span>
  );
}

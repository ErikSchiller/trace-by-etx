import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variants: Record<ButtonVariant, string> = {
  primary:   'bg-[#00d4aa] text-[#0a0a0f] hover:bg-[#00bfa0] font-semibold',
  secondary: 'bg-[#1e1e2e] text-[#e2e2f0] hover:bg-[#2a2a3d] border border-[#2a2a3d]',
  danger:    'bg-[rgba(255,71,87,0.15)] text-[#ff4757] hover:bg-[rgba(255,71,87,0.25)] border border-[rgba(255,71,87,0.3)]',
  ghost:     'text-[#8888aa] hover:text-[#e2e2f0] hover:bg-[#1e1e2e]',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({ children, variant = 'secondary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center gap-2 rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
}

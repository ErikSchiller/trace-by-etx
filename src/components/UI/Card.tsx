import type { ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-lg border border-[#1e1e2e] bg-[#16161f] p-4',
        onClick && 'cursor-pointer hover:border-[#2a2a3d] transition-colors',
        className
      )}
    >
      {children}
    </div>
  );
}

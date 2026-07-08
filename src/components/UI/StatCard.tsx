import type { ReactNode } from 'react';
import { clsx } from 'clsx';

interface StatCardProps {
  label: string;
  value: ReactNode;
  subvalue?: ReactNode;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatCard({ label, value, subvalue, icon, className }: StatCardProps) {
  return (
    <div className={clsx('rounded-lg border border-[#1e1e2e] bg-[#16161f] p-4 flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#8888aa] uppercase tracking-wider font-medium">{label}</span>
        {icon && <span className="text-[#55557a]">{icon}</span>}
      </div>
      <div className="text-xl font-mono font-semibold text-[#e2e2f0]">{value}</div>
      {subvalue && <div className="text-xs text-[#55557a] font-mono">{subvalue}</div>}
    </div>
  );
}

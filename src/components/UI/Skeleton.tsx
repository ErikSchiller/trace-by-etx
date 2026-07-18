import type { CSSProperties } from 'react';

type SkeletonVariant = 'text-sm' | 'text-md' | 'text-lg' | 'circle' | 'rectangle';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: CSSProperties;
}

const PRESET: Record<SkeletonVariant, CSSProperties> = {
  'text-sm': { height: 10, borderRadius: 4, width: '100%' },
  'text-md': { height: 14, borderRadius: 4, width: '100%' },
  'text-lg': { height: 20, borderRadius: 5, width: '60%' },
  circle:    { width: 40, height: 40, borderRadius: '50%' },
  rectangle: { width: '100%', height: 80, borderRadius: 10 },
};

export function Skeleton({ variant = 'text-md', width, height, radius, style }: SkeletonProps) {
  return (
    <div
      className="ui-skeleton"
      style={{
        ...PRESET[variant],
        ...(width !== undefined ? { width } : null),
        ...(height !== undefined ? { height } : null),
        ...(radius !== undefined ? { borderRadius: radius } : null),
        ...style,
      }}
    />
  );
}

export default Skeleton;

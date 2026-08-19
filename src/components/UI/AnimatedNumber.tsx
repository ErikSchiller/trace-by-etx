import { useEffect, useRef, useState } from 'react';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Returns `value` eased over `duration` ms whenever it changes. Honors reduced motion. */
export function useAnimatedValue(value: number, duration = 800): number {
  const prevRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;

    if (from === to) return;
    if (prefersReducedMotion() || !isFinite(from) || !isFinite(to) || duration <= 0) {
      setDisplay(to);
      return;
    }

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(from + (to - from) * easeOutCubic(t));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  return display;
}

interface Props {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Animates the transition between numeric values (e.g. when a KPI changes after
 * a trade is added/edited/deleted) instead of jumping. Uses requestAnimationFrame
 * with an ease-out cubic curve. Honors prefers-reduced-motion.
 */
export function AnimatedNumber({ value, duration = 800, format, className, style }: Props) {
  const fmt = format ?? ((n: number) => String(Math.round(n)));
  const display = useAnimatedValue(value, duration);
  return <span className={className} style={style}>{fmt(display)}</span>;
}

export default AnimatedNumber;

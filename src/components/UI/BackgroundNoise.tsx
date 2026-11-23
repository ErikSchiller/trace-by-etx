/**
 * Non-interactive grain overlay for the app page base. Fills its positioned
 * parent — AppLayout mounts it once inside a viewport-sized sticky layer at
 * the top of <main>, before the page content, so it sits behind everything
 * without a z-index (and so never traps page modals). Very subtle — opacity
 * stays in the 0.02–0.04 range so the grain never becomes visible.
 */
export function BackgroundNoise() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0.025,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        mixBlendMode: 'overlay',
      }}
    />
  );
}

export default BackgroundNoise;

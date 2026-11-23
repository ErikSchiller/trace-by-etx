/**
 * Fixed, non-interactive grain over the viewport background. AppLayout mounts
 * it once as a SIBLING placed before the app shell: it sits at z-index 1, above
 * the body's radial gradients and below the whole app (shell at z-index 2), so
 * `overlay` blends against the real page background and cards cover it. Keep
 * opacity in the 0.02–0.05 range — higher and the grain becomes visible.
 */
export function BackgroundNoise() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 1,
        opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
        mixBlendMode: 'overlay',
      }}
    />
  );
}

export default BackgroundNoise;

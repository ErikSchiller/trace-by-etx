type Size = 'sm' | 'md' | 'lg' | 'xl';

interface LogoMarkProps {
  size?: Size;
  showByEtx?: boolean;
  color?: string;
  chevronColor?: string;
  symbolOnly?: boolean;
}

const SIZES: Record<Size, string> = {
  sm: '1.1rem',
  md: '1.5rem',
  lg: '2.2rem',
  xl: '3rem',
};

/**
 * TR∧CE wordmark — the blue chevron replaces the letter A. Symmetric upward
 * wedge (peak at 50,10; wide base), taller than TR/CE with clear spacing.
 * This file is the single source of truth for the logo.
 */
export function LogoMark({
  size = 'md',
  showByEtx = true,
  color = '#ffffff',
  chevronColor = '#4f8fff',
  symbolOnly = false,
}: LogoMarkProps) {
  const fontSize = SIZES[size];

  // Just the chevron alone (favicon, collapsed sidebar)
  if (symbolOnly) {
    return (
      <svg
        viewBox="0 0 65 100"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: fontSize, height: fontSize, display: 'block', overflow: 'visible' }}
      >
        <polyline
          points="9,94 32.5,6 56,94"
          fill="none"
          stroke={chevronColor}
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, gap: '0.4em' }}>
      {/* WORDMARK: TR + chevron + CE */}
      <div
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize,
          letterSpacing: '0.08em',
          color,
          display: 'inline-flex',
          alignItems: 'flex-end', // align to baseline
          gap: '0.12em',
          lineHeight: 1,
        }}
      >
        <span style={{ lineHeight: 1 }}>TR</span>
        {/* viewBox aspect (65:100) matches the SVG box (0.78em:1.2em) so the
            chevron scales uniformly and fills the FULL 1.2em height — taller
            than the letters — instead of being letterboxed to its width. */}
        <svg
          viewBox="0 0 65 100"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: '0.78em',
            height: '1.2em', // taller than letters
            display: 'inline-block',
            overflow: 'visible',
            marginBottom: '-0.02em',
          }}
        >
          {/* Symmetric upward chevron. Narrow, tall wedge; peak at top-center. */}
          <polyline
            points="9,94 32.5,6 56,94"
            fill="none"
            stroke={chevronColor}
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span style={{ lineHeight: 1 }}>CE</span>
      </div>

      {/* TAGLINE: "by ETX" with "by" in blue */}
      {showByEtx && (
        <div
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '0.3em',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5em',
            lineHeight: 1,
          }}
        >
          <span style={{ color: chevronColor }}>by</span>
          <span style={{ color }}>ETX</span>
        </div>
      )}
    </div>
  );
}

export default LogoMark;

type Size = 'sm' | 'md' | 'lg' | 'xl';

interface LogoMarkProps {
  size?: Size;
  showByEtx?: boolean;
  color?: string;
  chevronColor?: string;
  symbolOnly?: boolean;
}

const SIZES: Record<Size, string> = {
  sm: '1rem',
  md: '1.4rem',
  lg: '2rem',
  xl: '2.8rem',
};

/**
 * TR∧CE wordmark. The ∧ (blue chevron) REPLACES the letter A — the A is never
 * drawn. The chevron is ~1.15x taller than the surrounding letters, its peak
 * rising above the cap-height, with clear spacing so it never touches TR / CE.
 * LogoMark.tsx is the single source of truth for the logo.
 */
export function LogoMark({
  size = 'md',
  showByEtx = true,
  color = '#ffffff',
  chevronColor = '#4f8fff',
  symbolOnly = false,
}: LogoMarkProps) {
  const fontSize = SIZES[size];

  // Chevron alone (collapsed sidebar, favicons)
  if (symbolOnly) {
    return (
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="TRACE"
        style={{ width: fontSize, height: fontSize, display: 'block' }}
      >
        <polyline
          points="50,10 15,88 85,88"
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
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
      {/* Wordmark row */}
      <div
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize,
          letterSpacing: '0.05em',
          color,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.08em', // KEY: gap between TR, chevron, CE
          lineHeight: 1,
        }}
      >
        <span>TR</span>
        <svg
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
          style={{
            // Chevron is TALLER than letters (~1.15x)
            width: '0.75em',
            height: '1.15em',
            display: 'inline-block',
            // Shift up so peak rises above cap-height
            marginTop: '-0.15em',
            overflow: 'visible',
          }}
        >
          <polyline
            points="50,8 15,88 85,88"
            fill="none"
            stroke={chevronColor}
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>CE</span>
      </div>

      {/* "by ETX" tagline */}
      {showByEtx && (
        <div
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '0.32em', // relative to parent
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginTop: '0.6em',
            display: 'inline-flex',
            gap: '0.4em', // gap between "by" and "ETX"
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

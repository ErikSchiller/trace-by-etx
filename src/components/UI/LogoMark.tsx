interface LogoMarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withBox?: boolean;
  showByEtx?: boolean;
  /** Render only the ∧ symbol (no TR / CE / by ETX). */
  symbolOnly?: boolean;
  /** Override the ∧ color (defaults to #4f8fff). */
  accent?: string;
}

const SIZE_REM: Record<NonNullable<LogoMarkProps['size']>, string> = {
  sm: '0.85rem',
  md: '1.15rem',
  lg: '1.75rem',
  xl: '2.4rem',
};

const BOX_PX: Record<NonNullable<LogoMarkProps['size']>, number> = {
  sm: 22,
  md: 28,
  lg: 36,
  xl: 44,
};

/**
 * TR∧CE wordmark. The ∧ is rendered as an inline SVG sized in `em`
 * so it matches Syne 800's cap-height and stroke weight at every size.
 * All em units resolve against the wordmark's own font-size.
 */
export function LogoMark({
  size = 'md',
  withBox = false,
  showByEtx = true,
  symbolOnly = false,
  accent = '#4f8fff',
}: LogoMarkProps) {
  const fontSize = SIZE_REM[size];

  // Standalone ∧ symbol — identical geometry/stroke to the wordmark caret.
  if (symbolOnly) {
    return (
      <svg
        viewBox="0 0 28 32"
        aria-label="TRACE"
        style={{ width: `calc(${fontSize} * 0.72)`, height: fontSize, display: 'block', fill: 'none' }}
      >
        <polyline
          points="14,2 2,30 26,30"
          stroke={accent}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const Caret = ({ color = accent }: { color?: string }) => (
    <svg
      viewBox="0 0 28 32"
      aria-hidden
      style={{
        width: '0.72em',
        height: '1em',
        display: 'inline-block',
        verticalAlign: 'baseline',
        position: 'relative',
        top: '0.05em',
        fill: 'none',
      }}
    >
      <polyline
        points="14,2 2,30 26,30"
        stroke={color}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  // font-size lives on the column so 0.42em / 0.72em / 0.05em all resolve
  // against the logo size regardless of surrounding context.
  const wordmark = (
    <span style={{ display: 'inline-block', fontSize, lineHeight: 1 }}>
      <span
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '0.02em',
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 0,
          lineHeight: 1,
        }}
      >
        <span>TR</span>
        <Caret />
        <span>CE</span>
      </span>
      {showByEtx && (
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            display: 'block',
            fontWeight: 500,
            color: '#4a4a60',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontSize: '0.42em',
            marginTop: 3,
          }}
        >
          by etx
        </span>
      )}
    </span>
  );

  if (!withBox) return wordmark;

  const box = BOX_PX[size];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: box,
          height: box,
          background: '#050508',
          border: '1px solid rgba(79,143,255,0.22)',
          borderRadius: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
          fontSize: `calc(${fontSize} * 1.05)`,
        }}
      >
        <Caret />
      </div>
      {wordmark}
    </div>
  );
}

export default LogoMark;

interface LogoMarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withBox?: boolean;
  showByEtx?: boolean;
  /** Override the ∧ color (defaults to #4f8fff). */
  accent?: string;
}

const SIZE_REM: Record<NonNullable<LogoMarkProps['size']>, string> = {
  sm: '0.82rem',
  md: '1.2rem',
  lg: '1.8rem',
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
 * so it matches Syne's cap-height at every font-size.
 */
export function LogoMark({
  size = 'md',
  withBox = false,
  showByEtx = true,
  accent = '#4f8fff',
}: LogoMarkProps) {
  const fontSize = SIZE_REM[size];

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

  const wordmark = (
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
      <span
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '0.06em',
          fontSize,
          display: 'inline-flex',
          alignItems: 'baseline',
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
            color: '#33334a',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontSize: `calc(${fontSize} * 0.48)`,
            marginTop: 2,
          }}
        >
          by etx
        </span>
      )}
    </div>
  );

  if (!withBox) return wordmark;

  const box = BOX_PX[size];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

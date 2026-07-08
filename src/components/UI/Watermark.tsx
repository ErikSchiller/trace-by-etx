export function Watermark() {
  return (
    <span
      className="panel-wm"
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        lineHeight: 1,
      }}
    >
      <span>TR</span>
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
          stroke="#252535"
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>CE</span>
    </span>
  );
}
export default Watermark;

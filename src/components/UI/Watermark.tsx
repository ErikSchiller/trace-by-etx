export function Watermark() {
  return (
    <span
      className="panel-wm"
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        gap: '0.12em',
        lineHeight: 1,
      }}
    >
      <span>TR</span>
      <svg
        viewBox="0 0 65 100"
        aria-hidden
        style={{
          width: '0.78em',
          height: '1.2em',
          display: 'inline-block',
          overflow: 'visible',
          marginBottom: '-0.02em',
        }}
      >
        <polyline
          points="9,94 32.5,6 56,94"
          fill="none"
          stroke="#252535"
          strokeWidth={14}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>CE</span>
    </span>
  );
}
export default Watermark;

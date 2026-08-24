import {
  type CardData, type CardOpts, HEAD, BODY, BLUE, BLUE_BRIGHT, heroValue, fmtRR, SESSION_LABEL,
  Wordmark, StreakBadge, QRTag,
} from '../shared';

/** Celebratory hero variant — used only for winning trades (dispatcher falls back to Clásico on losses). */
export function Ganador({ data, opts, W, H }: { data: CardData; opts: CardOpts; W: number; H: number }) {
  const vertical = opts.format === 'vertical';
  const sub = [
    data.asset,
    opts.showSetup && data.setup,
    opts.showSession && SESSION_LABEL[data.session],
    opts.showRR && fmtRR(data.realRR),
  ].filter(Boolean).join('  ·  ');

  // scattered decorative dots
  const dots = Array.from({ length: 40 }, (_, i) => ({
    x: (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1,
    y: (Math.sin(i * 78.233) * 12543.1234 % 1 + 1) % 1,
    r: 2 + (i % 4),
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0a0a0c 0%, #0f3460 100%)', color: '#fff', fontFamily: BODY, overflow: 'hidden' }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }} viewBox={`0 0 ${W} ${H}`}>
        {dots.map((d, i) => <circle key={i} cx={d.x * W} cy={d.y * H} r={d.r} fill={BLUE} opacity={0.18} />)}
      </svg>
      {/* corner chevrons */}
      <svg style={{ position: 'absolute', top: 40, left: 40, width: 70, height: 80, opacity: 0.15 }} viewBox="0 0 28 32"><polyline points="14,2 2,30 26,30" stroke={BLUE} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <svg style={{ position: 'absolute', bottom: 40, right: 40, width: 70, height: 80, opacity: 0.15, transform: 'rotate(180deg)' }} viewBox="0 0 28 32"><polyline points="14,2 2,30 26,30" stroke={BLUE} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>

      <div style={{ position: 'absolute', inset: 0, padding: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ marginTop: vertical ? 40 : 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <Wordmark size={100} />
          {opts.showStreak && data.streakLabel ? <StreakBadge label={data.streakLabel} scale={1.3} /> : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div style={{ fontSize: 34, letterSpacing: '0.32em', color: BLUE_BRIGHT, textTransform: 'uppercase' }}>Great Trade</div>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: vertical ? 230 : 190, color: BLUE_BRIGHT, lineHeight: 1, textShadow: `0 0 80px ${BLUE}88, 0 0 30px ${BLUE}66` }}>{heroValue(data, opts)}</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {opts.showRR && <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 46, color: '#fff', background: 'rgba(79,143,255,0.18)', border: '1px solid rgba(107,159,255,0.5)', padding: '14px 34px', borderRadius: 16 }}>R:R {fmtRR(data.realRR)}</span>}
            {opts.showScore && data.traceScore !== undefined && <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 46, color: '#fff', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', padding: '14px 34px', borderRadius: 16 }}>Score {data.traceScore}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 40, color: '#e0e8f5', textAlign: 'center' }}>{sub}</div>
          {opts.note && <div style={{ fontStyle: 'italic', fontSize: 30, color: '#8ba3c7' }}>{opts.note}</div>}
          {opts.showQR && <QRTag dataUrl={opts.qrDataUrl} scale={1} />}
          <div style={{ fontSize: 26, color: '#6b86ad', letterSpacing: '0.1em' }}>traceetx.com{opts.showHandle && data.handle ? `  ·  ${data.handle}` : ''}</div>
        </div>
      </div>
    </div>
  );
}

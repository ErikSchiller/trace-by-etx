import {
  type CardData, type CardOpts, HEAD, BODY, BLUE, RED, isWin, heroValue, fmtRR, SESSION_LABEL,
  StreakBadge, QRTag,
} from '../shared';

export function Cinematico({ data, opts, W }: { data: CardData; opts: CardOpts; W: number; H: number }) {
  const vertical = opts.format === 'vertical';
  const glow = isWin(data.pnl) ? BLUE : RED;
  const sub = [
    data.asset,
    data.direction === 'long' ? 'LONG' : 'SHORT',
    opts.showRR && fmtRR(data.realRR),
    opts.showSetup && data.setup,
    opts.showSession && SESSION_LABEL[data.session],
  ].filter(Boolean).join(' · ').toUpperCase();

  return (
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% ${vertical ? '42%' : '46%'}, ${glow}22 0%, #060608 55%)`, color: '#fff', fontFamily: BODY, overflow: 'hidden' }}>
      {/* faded screenshot backdrop */}
      {opts.screenshot && (
        <img src={opts.screenshot} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.14, filter: 'grayscale(0.3)' }} />
      )}
      {/* huge decorative chevron behind */}
      <svg viewBox="0 0 100 100" style={{ position: 'absolute', top: vertical ? '38%' : '42%', left: '50%', transform: 'translate(-50%,-50%)', width: W * 0.6, height: W * 0.82, opacity: 0.09, fill: 'none', overflow: 'visible' }}>
        <polyline points="10,90 50,10 90,90" stroke={BLUE} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* 3-region layout so content fills the full format */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: vertical ? '120px 90px' : '80px', boxSizing: 'border-box' }}>
        {/* Top region: streak / score */}
        <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>{opts.showStreak && data.streakLabel ? <StreakBadge label={data.streakLabel} scale={1.2} /> : null}</div>
          <div>{opts.showScore && data.traceScore !== undefined ? (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, color: '#6b7280', letterSpacing: '0.15em' }}>SCORE</div>
              <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 64, color: '#fff' }}>{data.traceScore}</div>
            </div>
          ) : null}</div>
        </div>

        {/* Middle region: hero */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: vertical ? 40 : 32 }}>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: vertical ? 300 : 210, color: '#fff', lineHeight: 1, textShadow: `0 0 90px ${glow}, 0 6px 40px ${glow}aa` }}>{heroValue(data, opts)}</div>
          <div style={{ fontSize: vertical ? 48 : 42, letterSpacing: '0.2em', color: '#9aa3b5', textAlign: 'center', maxWidth: '92%' }}>{sub}</div>
          {opts.note && <div style={{ fontStyle: 'italic', fontSize: 34, color: '#7a839a', letterSpacing: '0.05em' }}>{opts.note}</div>}
        </div>

        {/* Bottom region: brand */}
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          {opts.showQR && <QRTag dataUrl={opts.qrDataUrl} scale={1} />}
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: vertical ? 60 : 52, letterSpacing: '0.3em', color: '#fff' }}>TRACE</div>
          <div style={{ fontFamily: BODY, fontSize: 28, letterSpacing: '0.2em', color: '#6b7280' }}>BY ETX · TRACEETX.COM{opts.showHandle && data.handle ? ` · ${data.handle}` : ''}</div>
        </div>
      </div>
    </div>
  );
}

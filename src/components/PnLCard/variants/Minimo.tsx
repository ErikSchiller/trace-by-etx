import {
  type CardData, type CardOpts, HEAD, BODY, BLUE, pnlColor, heroValue, fmtRR, SESSION_LABEL,
  Wordmark, StreakBadge, QRTag,
} from '../shared';

export function Minimo({ data, opts }: { data: CardData; opts: CardOpts; W: number; H: number }) {
  const vertical = opts.format === 'vertical';
  const col = pnlColor(data.pnl);
  const pad = 96;
  const stats = [
    opts.showRR && `R:R ${fmtRR(data.realRR)}`,
    opts.showSetup && data.setup && `Setup ${data.setup}`,
    opts.showSession && SESSION_LABEL[data.session],
    opts.showDate && data.date,
    opts.showAccount && data.accountLabel,
  ].filter(Boolean) as string[];

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#ffffff', color: '#0a0a0c', fontFamily: BODY, padding: pad, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {/* top */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Wordmark size={64} color="#0a0a0c" accent={BLUE} byEtx={false} />
        {opts.showStreak && data.streakLabel ? <div style={{ filter: 'grayscale(0)' }}><StreakBadge label={data.streakLabel} scale={1.1} /></div> : <span />}
      </div>

      {/* center-left */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: vertical ? 8 : 4 }}>
        <div style={{ fontSize: 30, letterSpacing: '0.28em', color: '#9096a3', textTransform: 'uppercase', marginBottom: 10 }}>Operación</div>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: vertical ? 250 : 210, color: col, lineHeight: 0.92 }}>{heroValue(data, opts)}</div>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 60, color: '#0a0a0c', marginTop: 20 }}>
          {data.asset} <span style={{ color: col }}>·</span> {data.direction === 'long' ? 'LONG' : 'SHORT'}
        </div>
        {stats.length > 0 && (
          <div style={{ fontSize: 30, color: '#6b7280', marginTop: 16, letterSpacing: '0.02em' }}>{stats.join('   ·   ')}</div>
        )}
        {opts.showScore && data.traceScore !== undefined && (
          <div style={{ fontSize: 28, color: '#9096a3', marginTop: 10 }}>TRACE Score <b style={{ color: '#0a0a0c' }}>{data.traceScore}</b></div>
        )}
        {opts.note && <div style={{ fontStyle: 'italic', fontSize: 30, color: '#9096a3', marginTop: 18 }}>{opts.note}</div>}
      </div>

      {/* bottom */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 34, letterSpacing: '0.06em', color: '#0a0a0c' }}>TRACE</div>
          <div style={{ fontSize: 26, color: '#9096a3', marginTop: 4 }}>traceetx.com{opts.showHandle && data.handle ? `  ·  ${data.handle}` : ''}</div>
        </div>
        {opts.showQR && <QRTag dataUrl={opts.qrDataUrl} scale={1} dark />}
      </div>
    </div>
  );
}

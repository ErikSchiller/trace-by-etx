import {
  type CardData, type CardOpts, HEAD, BODY, BLUE, pnlColor, heroValue, fmtRR, SESSION_LABEL,
  Wordmark, DirectionBadge, StreakBadge, QRTag,
} from '../shared';

export function Clasico({ data, opts, W, H }: { data: CardData; opts: CardOpts; W: number; H: number }) {
  const vertical = opts.format === 'vertical';
  const col = pnlColor(data.pnl);
  const pad = 80;

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0c', color: '#fff', fontFamily: BODY, overflow: 'hidden' }}>
      {/* radial glow */}
      <div style={{ position: 'absolute', top: vertical ? '38%' : '46%', left: '50%', width: W * 1.1, height: W * 1.1, transform: 'translate(-50%,-50%)', background: `radial-gradient(circle, ${col}22 0%, transparent 60%)`, pointerEvents: 'none' }} />

      {/* top-corner badges */}
      <div style={{ position: 'absolute', top: pad * 0.55, left: pad, right: pad, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>{opts.showStreak && data.streakLabel ? <StreakBadge label={data.streakLabel} scale={1.4} /> : null}</div>
        <div>{opts.showScore && data.traceScore !== undefined ? <ScoreChip score={data.traceScore} /> : null}</div>
      </div>

      {vertical ? (
        <div style={{ position: 'absolute', inset: 0, padding: pad, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Top: logo */}
          <div style={{ marginTop: H * 0.10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Wordmark size={130} />
            <div style={{ marginTop: 22, fontSize: 26, letterSpacing: '0.32em', color: '#6b7280', textTransform: 'uppercase' }}>Trading Journal</div>
          </div>

          {/* Middle: the trade */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
            <DirectionBadge direction={data.direction} scale={1.5} />
            <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 92, color: '#fff', lineHeight: 1 }}>{data.asset}</div>
            <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 190, color: col, lineHeight: 1, textShadow: `0 0 60px ${col}44` }}>{heroValue(data, opts)}</div>
            {opts.showRR && <RRChip rr={data.realRR} />}
          </div>

          {/* Bottom: meta */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            {opts.showSetup && data.setup && <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 46, color: '#e0e0e8' }}>{data.setup}</div>}
            <div style={{ fontSize: 30, color: '#6b7280' }}>
              {[opts.showSession && SESSION_LABEL[data.session], opts.showDate && `${data.date}`, `${data.time}`].filter(Boolean).join(' · ')}
            </div>
            {opts.note && <div style={{ fontStyle: 'italic', fontSize: 30, color: '#8a90a8', marginTop: 6 }}>{opts.note}</div>}
            <Footer data={data} opts={opts} />
          </div>
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, padding: pad }}>
          {/* top row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Wordmark size={72} byEtx />
            <div style={{ textAlign: 'right', fontSize: 26, color: '#6b7280' }}>
              {opts.showSession && SESSION_LABEL[data.session]}{opts.showSession && ' · '}{data.time}
            </div>
          </div>
          {/* center */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
            <DirectionBadge direction={data.direction} scale={1.3} />
            <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 76, color: '#fff', lineHeight: 1 }}>{data.asset}</div>
            <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 165, color: col, lineHeight: 1, textShadow: `0 0 60px ${col}44` }}>{heroValue(data, opts)}</div>
            {opts.showRR && <RRChip rr={data.realRR} />}
          </div>
          {/* bottom row */}
          <div style={{ position: 'absolute', left: pad, right: pad, bottom: pad, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              {opts.showSetup && data.setup && <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 40, color: '#e0e0e8' }}>{data.setup}</div>}
              {opts.note && <div style={{ fontStyle: 'italic', fontSize: 26, color: '#8a90a8', marginTop: 6 }}>{opts.note}</div>}
            </div>
            <Footer data={data} opts={opts} align="right" />
          </div>
        </div>
      )}
    </div>
  );
}

function RRChip({ rr }: { rr: number }) {
  return <span style={{ fontFamily: BODY, fontWeight: 700, fontSize: 40, color: BLUE, background: 'rgba(79,143,255,0.12)', border: '1px solid rgba(79,143,255,0.35)', padding: '10px 26px', borderRadius: 14 }}>{fmtRR(rr)}</span>;
}
function ScoreChip({ score }: { score: number }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 22, color: '#6b7280', letterSpacing: '0.1em' }}>TRACE SCORE</div>
      <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 54, color: '#fff', lineHeight: 1 }}>{score}</div>
    </div>
  );
}
export function Footer({ data, opts, align = 'center' }: { data: CardData; opts: CardOpts; align?: 'center' | 'right' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-end' : 'center', gap: 10, marginTop: 12 }}>
      {opts.showQR && <QRTag dataUrl={opts.qrDataUrl} scale={1} />}
      <div style={{ fontSize: 26, color: '#4a4a60', letterSpacing: '0.1em' }}>traceetx.com{opts.showHandle && data.handle ? `  ·  ${data.handle}` : ''}</div>
    </div>
  );
}

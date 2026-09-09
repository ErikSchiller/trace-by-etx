import { type CardData, type CardOpts, HEAD, BODY, pnlColor, heroValue, dirColor, rrText, sessionTime, Wordmark, ScoreTag, QRBlock, Kicker } from '../shared';
import { RadarGrid } from '../graphics';

export function Radar({ data, opts, W, H }: { data: CardData; opts: CardOpts; W: number; H: number }) {
  const sq = opts.format === 'square';
  const accent = pnlColor(data.pnl);
  const k = sq ? 0.62 : 1;
  const pad = sq ? 72 : 84;
  const longShort = data.direction === 'long' ? 'LONG' : 'SHORT';

  return (
    <div style={{ width: W, height: H, background: '#0a0a0c', position: 'relative', overflow: 'hidden', fontFamily: BODY }}>
      {/* radar grid */}
      <div style={{ position: 'absolute', top: sq ? '50%' : '46%', left: '50%', transform: 'translate(-50%,-50%)' }}>
        <RadarGrid size={W * (sq ? 1.05 : 1.25)} />
      </div>
      {/* outcome glow behind hero */}
      <div style={{ position: 'absolute', top: sq ? '58%' : '60%', left: '50%', transform: 'translate(-50%,-50%)', width: W * 0.9, height: W * 0.9, background: `radial-gradient(circle, ${accent}2e 0%, transparent 62%)`, pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', inset: 0, padding: `${pad}px ${pad}px`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* top: score right */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', minHeight: opts.showScore ? undefined : 0 }}>
          {opts.showScore && <ScoreTag score={data.traceScore} scale={k} />}
        </div>

        {/* logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 * k, marginTop: sq ? 8 : 24 }}>
          <Wordmark size={92 * k} byEtx />
          <Kicker size={22 * k} ls="0.32em" align="center">Trading Journal</Kicker>
        </div>

        {/* middle */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: sq ? 4 : 10 }}>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 52 * k, letterSpacing: '0.08em', color: dirColor(data.direction) }}>{longShort}</div>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 300 * k, color: '#fff', lineHeight: 0.92, letterSpacing: '-0.01em' }}>{data.asset}</div>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 150 * k, color: accent, lineHeight: 1, marginTop: 12 * k, position: 'relative' }}>{heroValue(data, opts)}</div>
          {opts.showRR && <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 42 * k, color: 'rgba(255,255,255,0.55)', marginTop: 6 * k }}>{rrText(data.realRR)}</div>}
          {opts.showSession && <div style={{ fontFamily: BODY, fontSize: 34 * k, color: 'rgba(255,255,255,0.45)', marginTop: 4 * k }}>{sessionTime(data)}</div>}
        </div>

        {/* bottom */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 * k }}>
          {opts.showQR && <QRBlock dataUrl={opts.qrDataUrl} scale={k} align="center" />}
          <Kicker size={22 * k} ls="0.32em" align="center">Discipline Trades Longer</Kicker>
        </div>
      </div>
    </div>
  );
}

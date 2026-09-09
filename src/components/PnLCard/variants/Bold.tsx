import { type CardData, type CardOpts, HEAD, BODY, isWin, pnlColor, heroValue, dirColor, rrText, sessionTime, Wordmark, Kicker, Mantra } from '../shared';
import { SynthLineChart } from '../graphics';

export function Bold({ data, opts, W, H }: { data: CardData; opts: CardOpts; W: number; H: number }) {
  const sq = opts.format === 'square';
  const win = isWin(data.pnl);
  const accent = pnlColor(data.pnl);
  const k = sq ? 0.66 : 1;
  const pad = sq ? 64 : 80;
  const longShort = data.direction === 'long' ? 'LONG' : 'SHORT';

  return (
    <div style={{ width: W, height: H, background: '#0a0a0c', position: 'relative', overflow: 'hidden', fontFamily: BODY }}>
      {/* diagonal accent streak behind the hero */}
      <div style={{ position: 'absolute', top: sq ? '26%' : '30%', left: '-10%', width: '120%', height: sq ? 220 : 300, background: `linear-gradient(100deg, transparent, ${accent}22 40%, transparent)`, transform: 'rotate(-8deg)', pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', inset: 0, padding: pad, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        {/* top */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 * k }}>
            <Wordmark size={64 * k} byEtx />
            <Kicker size={19 * k} ls="0.26em">Trading Journal</Kicker>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 18 * k }}>
            {opts.showScore && (
              <div style={{ textAlign: 'right' }}>
                <Kicker size={21 * k} ls="0.16em" align="right">Trace Score</Kicker>
                <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 56 * k, color: '#fff', lineHeight: 1 }}>{data.traceScore}</div>
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <Kicker size={20 * k} ls="0.22em" align="right">Same process</Kicker>
              <Kicker size={20 * k} ls="0.22em" align="right">a stronger trader</Kicker>
            </div>
          </div>
        </div>

        {/* overflowing hero */}
        <div style={{ marginTop: sq ? 40 : 96, overflow: 'visible' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 268 * k, color: accent, lineHeight: 0.9, letterSpacing: '-0.03em', whiteSpace: 'nowrap', marginLeft: -pad * 0.7, textShadow: `0 0 ${80 * k}px ${accent}55` }}>{heroValue(data, opts)}</div>
        </div>

        {/* asset + line */}
        <div style={{ position: 'relative', marginTop: sq ? 24 : 60 }}>
          {opts.showSession && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: sq ? 40 : 70, opacity: 0.9 }}>
              <SynthLineChart w={W - pad * 2} h={sq ? 150 : 220} seed={`${data.asset}${data.pnl}${data.time}`} win={win} color="#4f8fff" strokeWidth={3 * k} fill />
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 52 * k, color: dirColor(data.direction) }}>{longShort}</div>
            <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 240 * k, color: '#fff', lineHeight: 0.9, letterSpacing: '-0.01em' }}>{data.asset}</div>
          </div>
        </div>

        {/* meta row */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 26 * k, fontFamily: BODY }}>
          {opts.showRR && <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 40 * k, color: '#fff' }}>{rrText(data.realRR)}</div>}
          {opts.showRR && opts.showSession && <div style={{ width: 1, height: 40 * k, background: 'rgba(255,255,255,0.18)' }} />}
          {opts.showSession && <div style={{ fontSize: 32 * k, color: 'rgba(255,255,255,0.6)' }}>{sessionTime(data)}</div>}
          {opts.showScore && <><div style={{ width: 1, height: 40 * k, background: 'rgba(255,255,255,0.18)' }} /><div style={{ fontFamily: BODY, fontSize: 30 * k, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em' }}>SCORE {data.traceScore}</div></>}
        </div>

        {/* foot */}
        <div style={{ marginTop: sq ? 28 : 48, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          {opts.showQR && opts.qrDataUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 * k }}>
              <img src={opts.qrDataUrl} alt="traceetx.com" style={{ width: 100 * k, height: 100 * k, borderRadius: 10 * k, background: '#fff', padding: 6 * k }} />
              <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 20 * k, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>traceetx.com</div>
            </div>
          ) : <span />}
          <Mantra scale={k} align="right" />
        </div>
      </div>
    </div>
  );
}

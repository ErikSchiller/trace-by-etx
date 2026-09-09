import { type CardData, type CardOpts, HEAD, BODY, pnlColor, heroValue, dirColor, rrText, sessionTime, Wordmark, ScoreTag } from '../shared';

export function Eclipse({ data, opts, W, H }: { data: CardData; opts: CardOpts; W: number; H: number }) {
  const sq = opts.format === 'square';
  const accent = pnlColor(data.pnl);
  const k = sq ? 0.6 : 1;
  const pad = sq ? 64 : 84;
  const longShort = data.direction === 'long' ? 'LONG' : 'SHORT';
  const moon = W * (sq ? 0.95 : 1.15);

  return (
    <div style={{ width: W, height: H, background: '#0a0a0c', position: 'relative', overflow: 'hidden', fontFamily: BODY }}>
      {/* moon */}
      <div style={{ position: 'absolute', top: -moon * (sq ? 0.5 : 0.56), left: '50%', transform: 'translateX(-50%)', width: moon, height: moon, borderRadius: '50%', background: 'radial-gradient(circle at 50% 60%, #1c1f27 0%, #14161c 45%, #0c0d11 66%, transparent 72%)', boxShadow: 'inset 0 8px 40px rgba(255,255,255,0.06)' }} />
      {/* center accent line */}
      <div style={{ position: 'absolute', top: pad, bottom: sq ? H * 0.32 : H * 0.3, left: '50%', width: 2, transform: 'translateX(-50%)', background: `linear-gradient(${accent}, ${accent}00)`, opacity: 0.85 }} />

      <div style={{ position: 'absolute', inset: 0, padding: pad, display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' }}>
        {/* top */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <Wordmark size={62 * k} byEtx />
          {opts.showScore && <div style={{ position: 'absolute', right: 0, top: 0 }}><ScoreTag score={data.traceScore} scale={k} /></div>}
        </div>

        {/* center content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: sq ? 2 : 8 }}>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 50 * k, letterSpacing: '0.1em', color: dirColor(data.direction), marginBottom: sq ? 8 : 24 }}>{longShort}</div>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 340 * k, color: '#fff', lineHeight: 0.9, letterSpacing: '-0.01em' }}>{data.asset}</div>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 150 * k, color: accent, lineHeight: 1, marginTop: sq ? 20 : 48 }}>{heroValue(data, opts)}</div>
          {opts.showRR && <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 40 * k, color: 'rgba(255,255,255,0.5)', marginTop: 8 * k }}>{rrText(data.realRR)}</div>}
        </div>

        {/* bottom */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 * k }}>
          {opts.showSession && <div style={{ fontFamily: BODY, fontSize: 34 * k, color: 'rgba(255,255,255,0.55)' }}>{sessionTime(data)}</div>}
          {opts.showQR && opts.qrDataUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 * k }}>
              <img src={opts.qrDataUrl} alt="traceetx.com" style={{ width: 96 * k, height: 96 * k, borderRadius: 9 * k, background: '#fff', padding: 5 * k }} />
              <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 22 * k, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>traceetx.com</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

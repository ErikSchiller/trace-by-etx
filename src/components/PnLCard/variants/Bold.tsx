import { type CardData, type CardOpts, HEAD, BODY, pnlColor, heroValue, dirColor, rrText, sessionTime, Wordmark, Kicker, Mantra } from '../shared';
import { SynthLineChart } from '../graphics';

export function Bold({ data, opts, W, H }: { data: CardData; opts: CardOpts; W: number; H: number }) {
  const sq = opts.format === 'square';
  const win = data.pnl >= 0;
  const accent = pnlColor(data.pnl);
  const k = sq ? 0.72 : 1;
  const padX = sq ? 50 : 60;
  const padY = sq ? 60 : 80;
  const longShort = data.direction === 'long' ? 'LONG' : 'SHORT';
  const hero = heroValue(data, opts);

  // Auto-fit the hero so it stays big but never clips: target = card width minus
  // a right gutter for the editorial tagline. 0.62em is a safe Syne-800 advance.
  const rightGutter = sq ? 170 : 220;
  // Reserve the left bleed + a gap so the number ends clear of the tagline column.
  const targetW = W - rightGutter - (sq ? 60 : 90);
  const heroSize = Math.max(sq ? 148 : 172, Math.min(sq ? 244 : 308, targetW / (hero.length * 0.62)));
  const assetSize = Math.min(sq ? 150 : 200, heroSize * 0.82); // asset stays under the PnL

  const chartW = sq ? 300 : 400;
  const chartH = sq ? 120 : 180;

  const VBar = () => <div style={{ width: 1, height: 30 * k, background: 'rgba(255,255,255,0.15)' }} />;

  return (
    <div style={{ width: W, height: H, background: '#0a0a0c', position: 'relative', overflow: 'hidden', fontFamily: BODY, boxSizing: 'border-box', padding: `${padY}px ${padX}px`, display: 'flex', flexDirection: 'column' }}>
      {/* diagonal accent streak behind hero */}
      <div style={{ position: 'absolute', top: sq ? '30%' : '32%', left: '-10%', width: '120%', height: sq ? 220 : 320, background: `linear-gradient(100deg, transparent, ${accent}1f 42%, transparent)`, transform: 'rotate(-7deg)', pointerEvents: 'none' }} />

      {/* ── REGION 1 · HEADER ── */}
      <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Wordmark size={68 * k} byEtx />
        {opts.showScore && (
          <div style={{ textAlign: 'right' }}>
            <Kicker size={26 * k} ls="0.2em" align="right" color="rgba(255,255,255,0.5)">Trace Score</Kicker>
            <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 62 * k, color: '#fff', lineHeight: 1, marginTop: 6 * k }}>{data.traceScore}</div>
          </div>
        )}
      </div>

      {/* ── REGION 2 · MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: sq ? 44 : 64, minHeight: 0 }}>
        {/* 2A · huge PnL (left-anchored, bottom) + editorial tagline (top-right) */}
        <div style={{ position: 'relative', minHeight: heroSize * 1.16 }}>
          <div style={{ position: 'absolute', top: 0, right: 0, textAlign: 'right', width: rightGutter - 30 }}>
            <Kicker size={24 * k} ls="0.2em" align="right">Same process</Kicker>
            <Kicker size={24 * k} ls="0.2em" align="right">a stronger</Kicker>
            <Kicker size={24 * k} ls="0.2em" align="right">trader</Kicker>
          </div>
          <div style={{ position: 'absolute', left: -(padX - (sq ? 14 : 20)), bottom: 0, fontFamily: HEAD, fontWeight: 800, fontSize: heroSize, color: accent, lineHeight: 1, letterSpacing: '-0.04em', whiteSpace: 'nowrap', textShadow: `0 0 ${44 * k}px ${accent}26` }}>{hero}</div>
        </div>

        {/* 2B · LONG / NQ + equity chart */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40 * k }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 68 * k, color: dirColor(data.direction), lineHeight: 1 }}>{longShort}</div>
            <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: assetSize, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em', marginTop: 6 * k }}>{data.asset}</div>
          </div>
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 * k }}>
            <SynthLineChart w={chartW} h={chartH} seed={`${data.asset}${data.pnl}${data.time}`} win={win} strokeWidth={4} fill dot />
            {opts.showRR && <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 40 * k, color: '#fff' }}>{rrText(data.realRR)}</div>}
          </div>
        </div>
      </div>

      {/* ── REGION 3 · FOOTER ── */}
      <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20 * k }}>
        {/* left meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 * k, flexWrap: 'nowrap' }}>
          {opts.showRR && <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 34 * k, color: '#fff' }}>{rrText(data.realRR)}</div>}
          {opts.showRR && opts.showSession && <VBar />}
          {opts.showSession && <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 28 * k, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>{sessionTime(data)}</div>}
          {opts.showScore && (opts.showRR || opts.showSession) && <VBar />}
          {opts.showScore && <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 28 * k, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>Score {data.traceScore}</div>}
        </div>

        {/* center QR */}
        {opts.showQR && opts.qrDataUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 * k, flexShrink: 0 }}>
            <img src={opts.qrDataUrl} alt="traceetx.com" style={{ width: 130 * k, height: 130 * k, borderRadius: 8 * k, background: '#fff', padding: 6 * k }} />
            <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 22 * k, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>traceetx.com</div>
          </div>
        )}

        {/* right mantra */}
        <Mantra scale={k} align="right" />
      </div>
    </div>
  );
}

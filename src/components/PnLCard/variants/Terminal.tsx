import { type CardData, type CardOpts, HEAD, BODY, isWin, pnlColor, heroValue, dirColor, rrText, sessionTime, ScoreTag } from '../shared';
import { SynthLineChart } from '../graphics';

function Divider({ o = 0.08 }: { o?: number }) {
  return <div style={{ height: 1, width: '100%', background: `rgba(255,255,255,${o})` }} />;
}

export function Terminal({ data, opts, W, H }: { data: CardData; opts: CardOpts; W: number; H: number }) {
  const sq = opts.format === 'square';
  const win = isWin(data.pnl);
  const accent = pnlColor(data.pnl);
  const k = sq ? 0.66 : 1;
  const outer = sq ? 34 : 40;
  const inner = sq ? 46 : 64;
  const longShort = data.direction === 'long' ? 'LONG' : 'SHORT';
  const label = (t: string) => <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 24 * k, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>{t}</div>;

  return (
    <div style={{ width: W, height: H, background: '#0a0a0c', position: 'relative', overflow: 'hidden', fontFamily: BODY, padding: outer, boxSizing: 'border-box' }}>
      <div style={{ width: '100%', height: '100%', border: '1px solid rgba(255,255,255,0.07)', borderRadius: sq ? 28 : 34, boxSizing: 'border-box', padding: inner, display: 'flex', flexDirection: 'column', gap: sq ? 16 : 22 }}>
        {/* top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 44 * k, letterSpacing: '0.06em', color: dirColor(data.direction) }}>{longShort}</div>
          {opts.showScore && <ScoreTag score={data.traceScore} scale={k} />}
        </div>
        <Divider />

        {/* asset */}
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 172 * k, color: '#fff', lineHeight: 0.92, letterSpacing: '-0.01em' }}>{data.asset}</div>
        <Divider />

        {/* pnl */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 * k }}>
          {label('PNL')}
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 128 * k, color: accent, lineHeight: 1 }}>{heroValue(data, opts)}</div>
        </div>
        <Divider />

        {/* rr */}
        {opts.showRR && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 * k }}>
              {label('R:R')}
              <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 56 * k, color: '#fff', lineHeight: 1 }}>{rrText(data.realRR)}</div>
            </div>
          </>
        )}

        {/* equity chart */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
          <SynthLineChart w={W - outer * 2 - inner * 2} h={sq ? 150 : 240} seed={`${data.asset}${data.pnl}${data.time}`} win={win} grid axes strokeWidth={3.5 * k} />
        </div>

        <Divider />
        {/* session */}
        {opts.showSession && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 * k, fontFamily: BODY, fontSize: 30 * k, color: 'rgba(255,255,255,0.55)' }}>
            <span style={{ fontSize: 28 * k }}>🕐</span>{sessionTime(data)}
          </div>
        )}

        {/* foot */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: sq ? 6 : 12 }}>
          {opts.showQR && opts.qrDataUrl
            ? <img src={opts.qrDataUrl} alt="traceetx.com" style={{ width: 100 * k, height: 100 * k, borderRadius: 10 * k, background: '#fff', padding: 6 * k }} />
            : <span />}
          <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 20 * k, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', textAlign: 'right', maxWidth: '60%', lineHeight: 1.7 }}>Same process<br />a stronger trader</div>
        </div>
      </div>
    </div>
  );
}

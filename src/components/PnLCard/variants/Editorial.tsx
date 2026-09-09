import { type CardData, type CardOpts, HEAD, BODY, isWin, pnlColor, heroValue, dirColor, rrText, sessionTime, Wordmark, BLUE } from '../shared';
import { SynthLineChart } from '../graphics';

export function Editorial({ data, opts, W, H }: { data: CardData; opts: CardOpts; W: number; H: number }) {
  const sq = opts.format === 'square';
  const win = isWin(data.pnl);
  const accent = pnlColor(data.pnl);
  const k = sq ? 0.7 : 1;
  const pad = sq ? 56 : 72;
  const longShort = data.direction === 'long' ? 'LONG' : 'SHORT';

  const Cell = ({ label, value, color = '#fff' }: { label: string; value: string; color?: string }) => (
    <div style={{ flex: 1, padding: `0 ${20 * k}px` }}>
      <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 19 * k, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 * k }}>{label}</div>
      <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 34 * k, color, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
  const VDiv = () => <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />;
  const HDiv = () => <div style={{ height: 1, width: '100%', background: 'rgba(255,255,255,0.1)' }} />;

  return (
    <div style={{ width: W, height: H, background: '#0a0a0c', overflow: 'hidden', fontFamily: BODY, padding: pad, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: sq ? 20 : 30 }}>
      {/* header grid */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1, padding: `0 ${20 * k}px` }}><Wordmark size={54 * k} byEtx /></div>
        <VDiv />
        <Cell label={longShort} value={data.asset} color={dirColor(data.direction)} />
        <VDiv />
        {opts.showScore && <><Cell label="Trace Score" value={String(data.traceScore ?? '')} /><VDiv /></>}
        <Cell label="Sesión" value={sessionTime(data)} />
      </div>
      <HDiv />

      {/* main pnl */}
      <div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 30 * k, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.42)' }}>PNL</div>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 168 * k, color: accent, lineHeight: 1, margin: `${6 * k}px 0` }}>{heroValue(data, opts)}</div>
        <div style={{ fontFamily: BODY, fontSize: 30 * k, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>
          {data.asset}&nbsp;&nbsp;<span style={{ color: dirColor(data.direction) }}>{longShort}</span>
        </div>
      </div>

      {/* chart */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
        <SynthLineChart w={W - pad * 2} h={sq ? 230 : 460} seed={`${data.asset}${data.pnl}${data.time}`} win={win} grid axes strokeWidth={3.5 * k} fill xLabels={['09:30', '11:00', '12:30', '14:00', '16:00']} />
      </div>

      <HDiv />
      {/* bottom meta grid */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Cell label="Dirección" value={longShort} color={dirColor(data.direction)} />
        <VDiv />
        <Cell label="R:R" value={rrText(data.realRR)} />
        <VDiv />
        <Cell label="Sesión" value={sessionTime(data)} />
        <VDiv />
        <Cell label="Score" value={String(data.traceScore ?? '')} />
      </div>
      <HDiv />

      {/* foot */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {opts.showQR && opts.qrDataUrl
          ? <img src={opts.qrDataUrl} alt="traceetx.com" style={{ width: 92 * k, height: 92 * k, borderRadius: 8 * k, background: '#fff', padding: 5 * k }} />
          : <span style={{ width: 92 * k }} />}
        <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 24 * k, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.5)' }}>traceetx.com</div>
        <div style={{ textAlign: 'right', fontFamily: BODY, fontWeight: 600, fontSize: 18 * k, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
          Trading<br />Journal<br /><span style={{ color: BLUE }}>by ETX</span>
        </div>
      </div>
    </div>
  );
}

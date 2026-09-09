import { type CardData, type CardOpts, HEAD, BODY, isWin, pnlColor, heroValue, dirColor, rrText, sessionTime, Wordmark, ScoreTag, Kicker, BLUE } from '../shared';
import { Candlesticks } from '../graphics';

export function Dossier({ data, opts, W, H }: { data: CardData; opts: CardOpts; W: number; H: number }) {
  const sq = opts.format === 'square';
  const win = isWin(data.pnl);
  const accent = pnlColor(data.pnl);
  const k = sq ? 0.7 : 1;
  const pad = sq ? 60 : 78;
  const longShort = data.direction === 'long' ? 'LONG' : 'SHORT';

  const rows: [string, string, string?][] = [
    ['Dirección', longShort, dirColor(data.direction)],
    ['Sesión', sessionTime(data)],
    ['R:R', rrText(data.realRR)],
  ];
  if (opts.showScore) rows.push(['Score', String(data.traceScore ?? '')]);

  const Row = ({ label, value, color = '#fff' }: { label: string; value: string; color?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${sq ? 16 : 22}px 0`, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 26 * k, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>{label}</div>
      <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 34 * k, color }}>{value}</div>
    </div>
  );

  return (
    <div style={{ width: W, height: H, background: '#0a0a0c', position: 'relative', overflow: 'hidden', fontFamily: BODY }}>
      {/* candlestick silhouette bottom */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: sq ? 120 : 190, height: sq ? 260 : 380 }}>
        <Candlesticks w={W} h={sq ? 260 : 380} seed={`${data.asset}${data.pnl}${data.time}`} opacity={0.18} trend={win ? 'up' : 'up'} />
      </div>

      <div style={{ position: 'absolute', inset: 0, padding: pad, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        {/* top */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 * k }}>
            <Wordmark size={58 * k} byEtx />
            <Kicker size={18 * k} ls="0.26em">Trading Journal</Kicker>
          </div>
          {opts.showScore && <ScoreTag score={data.traceScore} scale={k} />}
        </div>

        {/* dossier label */}
        <div style={{ marginTop: sq ? 24 : 44 }}>
          <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 26 * k, letterSpacing: '0.3em', textTransform: 'uppercase', color: BLUE }}>Session Dossier</div>
          <div style={{ height: 1, width: '100%', background: 'rgba(255,255,255,0.12)', marginTop: 18 * k }} />
        </div>

        {/* main info */}
        <div style={{ marginTop: sq ? 22 : 40 }}>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 48 * k, color: dirColor(data.direction) }}>{longShort}</div>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 190 * k, color: '#fff', lineHeight: 0.9, letterSpacing: '-0.01em' }}>{data.asset}</div>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 108 * k, color: accent, lineHeight: 1, marginTop: 8 * k }}>{heroValue(data, opts)}</div>
          {opts.showRR && <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 36 * k, color: 'rgba(255,255,255,0.5)', marginTop: 6 * k }}>{rrText(data.realRR)}</div>}
        </div>

        {/* table */}
        <div style={{ marginTop: sq ? 24 : 44 }}>
          {rows.map((r, i) => <Row key={i} label={r[0]} value={r[1]} color={r[2]} />)}
          <div style={{ height: 1, width: '100%', background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* foot */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          {opts.showQR && opts.qrDataUrl
            ? <img src={opts.qrDataUrl} alt="traceetx.com" style={{ width: 92 * k, height: 92 * k, borderRadius: 8 * k, background: '#fff', padding: 5 * k }} />
            : <span style={{ width: 92 * k }} />}
          <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 24 * k, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.5)' }}>traceetx.com</div>
          <div style={{ textAlign: 'right', fontFamily: BODY, fontWeight: 600, fontSize: 18 * k, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
            Trading<br />Journal<br /><span style={{ color: BLUE }}>by ETX</span>
          </div>
        </div>
      </div>
    </div>
  );
}

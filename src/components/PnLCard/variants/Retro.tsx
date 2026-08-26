import {
  type CardData, type CardOpts, BODY, BLUE, pnlColor, heroValue, fmtRR, SESSION_LABEL,
  StreakBadge, QRTag,
} from '../shared';

export function Retro({ data, opts }: { data: CardData; opts: CardOpts; W: number; H: number }) {
  const vertical = opts.format === 'vertical';
  const col = pnlColor(data.pnl);
  const mono: React.CSSProperties = { fontFamily: BODY, letterSpacing: '0.04em' };
  const size = vertical ? 56 : 42;

  const lines: { label: string; value: string; color?: string }[] = [
    { label: '> ORDER FILLED', value: '' },
    { label: '> SYMBOL:', value: data.asset },
    { label: '> SIDE:', value: data.direction.toUpperCase(), color: col },
    { label: '> NET P&L:', value: heroValue(data, opts), color: col },
  ];
  if (opts.showRR) lines.push({ label: '> R:R:', value: fmtRR(data.realRR), color: BLUE });
  if (opts.showSetup && data.setup) lines.push({ label: '> SETUP:', value: data.setup.toUpperCase() });
  if (opts.showSession) lines.push({ label: '> SESSION:', value: (SESSION_LABEL[data.session] ?? data.session).toUpperCase() });
  if (opts.showScore && data.traceScore !== undefined) lines.push({ label: '> TRACE SCORE:', value: String(data.traceScore), color: BLUE });
  if (opts.showAccount && data.accountLabel) lines.push({ label: '> ACCOUNT:', value: data.accountLabel.toUpperCase() });
  if (opts.showDate) lines.push({ label: '> DATE:', value: data.date });

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0c', color: '#e0e0e8', ...mono, overflow: 'hidden' }}>
      {/* blue scanlines */}
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(79,143,255,0.05) 0px, rgba(79,143,255,0.05) 2px, transparent 2px, transparent 6px)', pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', inset: 0, padding: vertical ? '110px 80px' : 88, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* ASCII logo */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 104, color: '#fff', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.08em' }}>
                <span>TR</span>
                <svg viewBox="0 0 100 100" style={{ width: '0.75em', height: '1.15em', marginTop: '-0.15em', overflow: 'visible' }}><polyline points="50,8 15,88 85,88" fill="none" stroke={BLUE} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>CE</span>
              </div>
              <div style={{ fontSize: 40, color: BLUE, letterSpacing: '0.3em', marginTop: 6 }}>══════════</div>
              <div style={{ fontSize: 28, color: '#6b7280', letterSpacing: '0.2em', marginTop: 6 }}>by ETX</div>
            </div>
            {opts.showStreak && data.streakLabel ? <StreakBadge label={data.streakLabel} scale={1.1} /> : null}
          </div>
        </div>

        {/* ticker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: vertical ? 20 : 14 }}>
          {lines.map((l, i) => (
            <div key={i} style={{ fontSize: l.label.includes('P&L') ? size * 1.5 : size, color: l.color ?? (l.value ? '#e0e0e8' : BLUE), display: 'flex', gap: 16, alignItems: 'baseline' }}>
              <span style={{ color: '#4a4a60' }}>{l.label}</span>
              <span style={{ fontWeight: 700 }}>{l.value}</span>
            </div>
          ))}
        </div>

        {/* footer */}
        <div>
          {opts.note && <div style={{ fontSize: 30, color: '#6b7280', marginBottom: 16 }}>{'> '}{opts.note.toUpperCase()}</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 34, color: BLUE, display: 'flex', alignItems: 'center', gap: 4 }}>
              {'> '}TRACEETX.COM{opts.showHandle && data.handle ? ` · ${data.handle.toUpperCase()}` : ''}
              <span style={{ display: 'inline-block', width: 20, height: 40, background: BLUE, marginLeft: 8 }} />
            </div>
            {opts.showQR && <QRTag dataUrl={opts.qrDataUrl} scale={1} />}
          </div>
        </div>
      </div>
    </div>
  );
}

import { forwardRef } from 'react';
import { type CardData, type CardOpts, DIMS } from './shared';
import { Radar } from './variants/Radar';
import { Terminal } from './variants/Terminal';
import { Bold } from './variants/Bold';
import { Editorial } from './variants/Editorial';
import { Eclipse } from './variants/Eclipse';
import { Dossier } from './variants/Dossier';

/** Renders the PnL card at native export resolution. Attach a ref for html-to-image. */
export const PnLCard = forwardRef<HTMLDivElement, { data: CardData; opts: CardOpts }>(({ data, opts }, ref) => {
  const { w, h } = DIMS[opts.format];
  return (
    <div ref={ref} style={{ width: w, height: h, position: 'relative', overflow: 'hidden', borderRadius: 0 }}>
      <Variant data={data} opts={opts} W={w} H={h} />
    </div>
  );
});
PnLCard.displayName = 'PnLCard';

function Variant({ data, opts, W, H }: { data: CardData; opts: CardOpts; W: number; H: number }) {
  switch (opts.variant) {
    case 'terminal': return <Terminal data={data} opts={opts} W={W} H={H} />;
    case 'bold': return <Bold data={data} opts={opts} W={W} H={H} />;
    case 'editorial': return <Editorial data={data} opts={opts} W={W} H={H} />;
    case 'eclipse': return <Eclipse data={data} opts={opts} W={W} H={H} />;
    case 'dossier': return <Dossier data={data} opts={opts} W={W} H={H} />;
    case 'radar':
    default: return <Radar data={data} opts={opts} W={W} H={H} />; // legacy ids fall back to Radar
  }
}

export default PnLCard;

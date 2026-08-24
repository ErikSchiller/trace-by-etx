import { forwardRef } from 'react';
import { type CardData, type CardOpts, DIMS, isWin } from './shared';
import { Clasico } from './variants/Clasico';
import { Minimo } from './variants/Minimo';
import { Ganador } from './variants/Ganador';
import { Retro } from './variants/Retro';
import { Cinematico } from './variants/Cinematico';

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
    case 'minimo': return <Minimo data={data} opts={opts} W={W} H={H} />;
    case 'ganador': return isWin(data.pnl) ? <Ganador data={data} opts={opts} W={W} H={H} /> : <Clasico data={data} opts={opts} W={W} H={H} />;
    case 'retro': return <Retro data={data} opts={opts} W={W} H={H} />;
    case 'cinematico': return <Cinematico data={data} opts={opts} W={W} H={H} />;
    default: return <Clasico data={data} opts={opts} W={W} H={H} />;
  }
}

export default PnLCard;

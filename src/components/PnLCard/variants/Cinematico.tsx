import { type CardData, type CardOpts } from '../shared';
import { Clasico } from './Clasico';

// Placeholder — real design lands in phase 2.
export function Cinematico(props: { data: CardData; opts: CardOpts; W: number; H: number }) {
  return <Clasico {...props} />;
}

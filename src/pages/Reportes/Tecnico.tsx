import type { Trade } from '../../store/tradeStore';
import { SectionEmpty } from './shared';

interface Props { trades: Trade[]; prevTrades: Trade[] | null; compareOn: boolean }

export function Tecnico(_props: Props) {
  return <SectionEmpty icon="🔧" title="Análisis técnico" desc="Setups, sesiones, timing y ejecución — próximamente en esta sección." />;
}

import type { Trade } from '../../store/tradeStore';
import type { PropFirmAccount } from '../../store/propFirmStore';
import { SectionEmpty } from './shared';

interface Props { trades: Trade[]; accounts: PropFirmAccount[] }

export function Personalizado(_props: Props) {
  return <SectionEmpty icon="🧩" title="Dashboards personalizados" desc="Construye tu propio dashboard con widgets arrastrables — próximamente." />;
}

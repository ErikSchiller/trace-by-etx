import type { Trade } from '../../store/tradeStore';
import type { PropFirmAccount } from '../../store/propFirmStore';
import { SectionEmpty } from './shared';

interface Props { trades: Trade[]; prevTrades: Trade[] | null; compareOn: boolean; accounts: PropFirmAccount[] }

export function PropFirmsReport({ accounts }: Props) {
  if (accounts.length === 0) {
    return <SectionEmpty icon="🏦" title="Sin cuentas prop firm" desc="Añade tu primera cuenta prop firm para ver análisis de ROI, payouts y evaluaciones aquí." ctaLabel="Ir a Prop Firms" href="/prop-firms" />;
  }
  return <SectionEmpty icon="🏦" title="Análisis de prop firms" desc="ROI por firma, evaluaciones, payouts y costes — próximamente." />;
}

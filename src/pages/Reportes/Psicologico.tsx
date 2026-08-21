import type { Trade } from '../../store/tradeStore';
import { SectionEmpty } from './shared';

interface Props { trades: Trade[]; prevTrades: Trade[] | null; compareOn: boolean }

export function Psicologico(_props: Props) {
  return <SectionEmpty icon="🧠" title="Análisis psicológico" desc="Estado emocional, disciplina y patrones de comportamiento — próximamente." />;
}

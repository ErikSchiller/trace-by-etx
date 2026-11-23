import { Sunrise, Target, ClipboardCheck, Moon, type LucideIcon } from 'lucide-react';
import { stepComplete, stepSkipped, type DailyFlowDay, type StepId } from '../../store/dailyFlowStore';
import type { StepState } from './StepCard';

export const STEP_META: Record<StepId, { number: string; title: string; description: string; Icon: LucideIcon }> = {
  pre_market: { number: '01', title: 'Pre-market Setup', Icon: Sunrise, description: 'Antes de abrir el mercado — estado emocional y checklist pre-operativa.' },
  discipline: { number: '02', title: 'Discipline', Icon: Target, description: 'Define las reglas que te vas a cumplir hoy. Ganas por no romperlas.' },
  trade_recap: { number: '03', title: 'Trade Recap', Icon: ClipboardCheck, description: 'Califica cada operación del día por ejecución, no por resultado.' },
  day_wrap: { number: '04', title: 'Day Wrap', Icon: Moon, description: 'Reflexión final y firma de cierre. Sella el día.' },
};

export function relTime(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'hace un momento';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
}

/** Card state + status line for a step, given today's trade ids. */
export function describeStep(step: StepId, day: DailyFlowDay | undefined, todayTradeIds: string[]): { state: StepState; text: string } {
  if (stepSkipped(day, step)) return { state: 'skipped', text: 'Saltado' };
  const done = (iso?: string) => `✓ Completado${iso ? ` · ${relTime(iso)}` : ''}`;
  switch (step) {
    case 'pre_market':
      return stepComplete(day, step) ? { state: 'completed', text: done(day?.preMarket?.completedAt) } : { state: 'not_started', text: 'No iniciado' };
    case 'discipline': {
      const tasks = day?.discipline?.tasks ?? [];
      if (stepComplete(day, step)) return { state: 'completed', text: `${done(day?.discipline?.completedAt)} · ${tasks.filter(t => t.done).length}/${tasks.length} reglas` };
      if (tasks.length) return { state: 'in_progress', text: `${tasks.filter(t => t.done).length}/${tasks.length} reglas cumplidas` };
      return { state: 'not_started', text: 'No iniciado' };
    }
    case 'trade_recap': {
      const graded = (day?.tradeRecap?.entries ?? []).filter(e => todayTradeIds.includes(e.tradeId)).length;
      if (stepComplete(day, step)) return { state: 'completed', text: todayTradeIds.length ? `${done(day?.tradeRecap?.completedAt)} · ${graded}/${todayTradeIds.length} calificados` : `${done(day?.tradeRecap?.completedAt)} · día sin trades` };
      if (!todayTradeIds.length) return { state: 'not_started', text: 'Aún sin trades hoy' };
      return { state: graded ? 'in_progress' : 'not_started', text: `${graded} / ${todayTradeIds.length} trades calificados` };
    }
    case 'day_wrap':
      return stepComplete(day, step) ? { state: 'completed', text: `✓ Firmado · ${relTime(day!.dayWrap!.signedAt)}` } : { state: 'not_started', text: 'No iniciado' };
  }
}

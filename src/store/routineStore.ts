import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export interface Habit { id: string; text: string }
export interface Routine { name: string; habits: Habit[] }

interface RoutineStore {
  routine: Routine | null;
  /** date (YYYY-MM-DD) -> list of completed habit ids */
  completions: Record<string, string[]>;
  setRoutine: (name: string, habits: string[]) => void;
  updateRoutine: (name: string, habits: Habit[]) => void;
  toggleHabit: (date: string, habitId: string) => void;
  clearRoutine: () => void;
}

export const useRoutineStore = create<RoutineStore>()(
  persist(
    (set) => ({
      routine: null,
      completions: {},
      setRoutine: (name, habits) =>
        set({ routine: { name, habits: habits.map(text => ({ id: nanoid(), text })) } }),
      updateRoutine: (name, habits) => set({ routine: { name, habits } }),
      toggleHabit: (date, habitId) =>
        set(s => {
          const cur = s.completions[date] ?? [];
          const next = cur.includes(habitId) ? cur.filter(id => id !== habitId) : [...cur, habitId];
          return { completions: { ...s.completions, [date]: next } };
        }),
      clearRoutine: () => set({ routine: null }),
    }),
    { name: 'trace_routine' }
  )
);

/** Fraction (0..1) of the current routine's habits completed on a given date. */
export function dayRatio(routine: Routine | null, completed: string[] | undefined): number {
  if (!routine || routine.habits.length === 0) return 0;
  const ids = new Set(routine.habits.map(h => h.id));
  const done = (completed ?? []).filter(id => ids.has(id)).length;
  return done / routine.habits.length;
}

export interface Template {
  id: string;
  emoji: string;
  title: string;
  description: string;
  habits: string[];
}

export const TEMPLATES: Template[] = [
  {
    id: 'day-trader', emoji: '🎯', title: 'Day Trader Disciplinado',
    description: 'Foco en pre-market prep, ejecución limpia y revisión post-sesión.',
    habits: [
      'Revisé el economic calendar antes de abrir mercado',
      'Identifiqué mis niveles clave (soporte / resistencia)',
      'Definí mi plan A y plan B por escrito',
      'Esperé a mi setup confirmado antes de entrar',
      'Respeté mi stop loss sin moverlo',
      'Registré el trade en TRACE al cerrar',
    ],
  },
  {
    id: 'prop-firm', emoji: '🏆', title: 'Prop Firm Challenger',
    description: 'Para traders que están pasando una evaluación.',
    habits: [
      'Revisé mi distancia al daily loss limit al abrir',
      'Calculé mi profit target para hoy',
      'Solo operé mis setups A+ (no exploratorios)',
      'Cerré todas las posiciones antes de cierre de sesión',
      'Revisé mi consistency rule (mejor día ≤ X% del PnL)',
    ],
  },
  {
    id: 'mindful', emoji: '🧘', title: 'Trader Consciente',
    description: 'Foco en gestión emocional y disciplina mental.',
    habits: [
      'Hice 5 minutos de meditación / respiración',
      'Escribí una intención para la sesión',
      'No operé bajo emociones fuertes (FOMO, revenge)',
      'Tomé break de 15 min después de un loser',
      'Escribí una reflexión al cerrar el día',
    ],
  },
  {
    id: 'complete', emoji: '🌟', title: 'Rutina completa',
    description: 'Combina lo mejor de todas — para traders serios.',
    habits: [
      'Revisé el economic calendar antes de abrir mercado',
      'Identifiqué mis niveles clave y escribí mi plan',
      'Revisé mi distancia al daily loss limit',
      'Hice 5 minutos de respiración / centrado',
      'Solo operé mis setups A+ confirmados',
      'Respeté mi stop loss sin moverlo',
      'Tomé break de 15 min después de un loser',
      'Registré cada trade en TRACE al cerrar',
      'Escribí una reflexión al cerrar el día',
    ],
  },
];

export const SUGGESTED_HABITS = [
  'Revisar economic calendar', 'Marcar niveles clave', 'Escribir plan del día',
  'Meditar 5 min', 'Respetar SL', 'Registrar trade', 'Revisar el día',
  'Sin pantallas al despertar', 'Preparar setup A+', 'Cerrar antes de EOD',
];

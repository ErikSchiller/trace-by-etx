import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Trade, DailyPlan, Settings, DailyMood, Language } from '../types';
import { calcPnL, calcPlannedRR, calcRealRR } from '../utils/calculations';

interface AppState {
  trades: Trade[];
  dailyPlans: DailyPlan[];
  moods: DailyMood[];
  settings: Settings;
  language: Language;

  addTrade: (trade: Omit<Trade, 'id' | 'pnl' | 'plannedRR' | 'realRR'>) => void;
  updateTrade: (id: string, trade: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;

  saveDailyPlan: (plan: DailyPlan) => void;
  getDailyPlan: (date: string) => DailyPlan | undefined;

  saveMood: (mood: DailyMood) => void;
  getMood: (date: string) => DailyMood | undefined;

  updateSettings: (settings: Partial<Settings>) => void;
  setLanguage: (lang: Language) => void;
}

const defaultSettings: Settings = {
  setups: ['Breakout', 'Pullback', 'ORB', 'Reversión', 'Continuación'],
  dailyLossLimit: 500,
  accountSize: 10000,
  defaultCommission: 3.5,
  currencySymbol: '$',
  defaultChecklistItems: [
    'Revisé niveles clave',
    'Verifiqué noticias macro',
    'Descansé bien',
    'Definí mi plan',
    'Revisé trades anteriores',
  ],
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      trades: [],
      dailyPlans: [],
      moods: [],
      settings: defaultSettings,
      language: 'es',

      addTrade: (tradeData) => {
        const { settings } = get();
        const pnl = calcPnL(
          tradeData.direction,
          tradeData.entryPrice,
          tradeData.exitPrice,
          tradeData.positionSize,
          tradeData.commission ?? settings.defaultCommission
        );
        const plannedRR = calcPlannedRR(
          tradeData.direction,
          tradeData.entryPrice,
          tradeData.stopLoss,
          tradeData.takeProfit
        );
        const realRR = calcRealRR(
          tradeData.direction,
          tradeData.entryPrice,
          tradeData.stopLoss,
          tradeData.exitPrice
        );
        const trade: Trade = {
          ...tradeData,
          id: crypto.randomUUID(),
          pnl,
          plannedRR,
          realRR,
        };
        set(state => ({ trades: [...state.trades, trade] }));
      },

      updateTrade: (id, updates) => {
        set(state => ({
          trades: state.trades.map(t => {
            if (t.id !== id) return t;
            const updated = { ...t, ...updates };
            updated.pnl = calcPnL(
              updated.direction,
              updated.entryPrice,
              updated.exitPrice,
              updated.positionSize,
              updated.commission
            );
            updated.plannedRR = calcPlannedRR(
              updated.direction,
              updated.entryPrice,
              updated.stopLoss,
              updated.takeProfit
            );
            updated.realRR = calcRealRR(
              updated.direction,
              updated.entryPrice,
              updated.stopLoss,
              updated.exitPrice
            );
            return updated;
          }),
        }));
      },

      deleteTrade: (id) => {
        set(state => ({ trades: state.trades.filter(t => t.id !== id) }));
      },

      saveDailyPlan: (plan) => {
        set(state => ({
          dailyPlans: [
            ...state.dailyPlans.filter(p => p.date !== plan.date),
            plan,
          ],
        }));
      },

      getDailyPlan: (date) => {
        return get().dailyPlans.find(p => p.date === date);
      },

      saveMood: (mood) => {
        set(state => ({
          moods: [
            ...state.moods.filter(m => m.date !== mood.date),
            mood,
          ],
        }));
      },

      getMood: (date) => {
        return get().moods.find(m => m.date === date);
      },

      updateSettings: (updates) => {
        set(state => ({ settings: { ...state.settings, ...updates } }));
      },

      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'trading-journal-v1',
    }
  )
);

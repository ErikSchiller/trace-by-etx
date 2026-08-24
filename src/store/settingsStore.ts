import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Currency = 'USD' | 'EUR' | 'GBP';

export interface Settings {
  accountSize: number;
  dailyLossLimit: number;
  defaultCommission: number;
  defaultMultiplier: number;
  currency: Currency;
  currencySymbol: '$' | '€' | '£';
  setups: string[];
  accentColor: string;
  timezone: string;
  /** When true, break-even trades (PnL = 0) count as wins for the win rate. */
  beCountsAsWin: boolean;
  // Appearance
  compactMode: boolean;
  density: 'comfortable' | 'standard' | 'compact';
  syneNumbers: boolean;
  // Trading
  defaultInputMode: 'direct' | 'calculated';
  // Notifications
  notifyRisk: boolean;
  notifyStreak: boolean;
  notifyWeekly: boolean;
  // Feedback (polish features)
  celebrationsEnabled: boolean;
  soundsEnabled: boolean;
  // PnL Cards
  cardDefaultVariant: 'clasico' | 'minimo' | 'ganador' | 'retro' | 'cinematico';
  cardDefaultFormat: 'square' | 'vertical';
  cardHandle: string;
  cardSuggest: boolean;
  // Language & region
  language: 'es' | 'en';
  numberFormat: 'es' | 'us';
  dateFormat: 'dmy' | 'mdy' | 'ymd';
}

interface SettingsStore extends Settings {
  updateSettings: (partial: Partial<Settings>) => void;
  addSetup: (name: string) => void;
  removeSetup: (name: string) => void;
  resetSettings: () => void;
}

const SYMBOLS: Record<Currency, '$' | '€' | '£'> = {
  USD: '$', EUR: '€', GBP: '£',
};

const defaults: Settings = {
  accountSize: 100000,
  dailyLossLimit: 500,
  defaultCommission: 0,
  defaultMultiplier: 1,
  currency: 'EUR',
  currencySymbol: '€',
  setups: ['Breakout', 'Pullback', 'Reversión', 'VWAP', 'ORB'],
  accentColor: '#4f8fff',
  timezone: 'Europe/Madrid',
  beCountsAsWin: true,
  compactMode: false,
  density: 'standard',
  syneNumbers: true,
  defaultInputMode: 'direct',
  notifyRisk: true,
  notifyStreak: true,
  notifyWeekly: false,
  celebrationsEnabled: true,
  soundsEnabled: false,
  cardDefaultVariant: 'clasico',
  cardDefaultFormat: 'vertical',
  cardHandle: '',
  cardSuggest: true,
  language: 'es',
  numberFormat: 'es',
  dateFormat: 'dmy',
};

export const TIMEZONES = [
  { value: 'Europe/Madrid',     label: 'Europa/Madrid' },
  { value: 'Europe/London',     label: 'Europa/Londres' },
  { value: 'America/New_York',  label: 'América/Nueva York' },
  { value: 'America/Chicago',   label: 'América/Chicago' },
  { value: 'Asia/Tokyo',        label: 'Asia/Tokio' },
];

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...defaults,

      updateSettings: (partial) => {
        const next: Partial<Settings> = { ...partial };
        if (partial.currency && SYMBOLS[partial.currency]) {
          next.currencySymbol = SYMBOLS[partial.currency];
        }
        set(next as SettingsStore);
      },

      addSetup: (name) => {
        const clean = name.trim();
        if (!clean) return;
        const existing = get().setups;
        if (existing.some(s => s.toLowerCase() === clean.toLowerCase())) return;
        set({ setups: [...existing, clean] });
      },

      removeSetup: (name) => {
        set({ setups: get().setups.filter(s => s !== name) });
      },

      resetSettings: () => set({ ...defaults }),
    }),
    { name: 'trace_settings' }
  )
);

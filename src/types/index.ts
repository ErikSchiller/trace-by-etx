export type Direction = 'long' | 'short';
export type Session = 'london' | 'new_york' | 'asia' | 'premarket';
export type ExitType = 'sl_hit' | 'tp_hit' | 'manual';
export type EmotionalState = 1 | 2 | 3 | 4 | 5;

export const ERROR_TAGS = [
  'FOMO',
  'Venganza',
  'Salida prematura',
  'Entrada tardía',
  'Sobredimensionado',
  'Sin setup',
  'SL movido',
] as const;

export type ErrorTag = typeof ERROR_TAGS[number];

export interface Trade {
  id: string;
  date: string;
  time: string;
  asset: string;
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  pnl: number;
  plannedRR: number;
  realRR: number;
  commission: number;
  setup: string;
  session: Session;
  screenshots: string[];
  entryReason: string;
  postTradeNotes: string;
  emotionalState: EmotionalState;
  isPlanBased: boolean;
  exitType: ExitType;
  errorTags: string[];
}

export interface DailyPlan {
  date: string;
  keyLevels: string;
  newsEvents: string;
  gamePlan: string;
  maxLossLimit: number;
  watchlist: string[];
  checklist: { item: string; checked: boolean }[];
  moodBefore: EmotionalState;
  weeklyReflection?: string;
}

export interface Settings {
  setups: string[];
  dailyLossLimit: number;
  accountSize: number;
  defaultCommission: number;
  currencySymbol: string;
  defaultChecklistItems: string[];
}

export interface DailyMood {
  date: string;
  mood: EmotionalState;
  notes: string;
}

export type Language = 'es' | 'en';

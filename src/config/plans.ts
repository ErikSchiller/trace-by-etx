export type PlanId = 'free' | 'pro' | 'pro_ai' | 'founder';

export interface PlanFeatures {
  maxTradesPerMonth: number;
  maxNotebookFolders: number;
  basicAnalytics: boolean;
  advancedAnalytics: boolean;
  progressTracker: 'none' | 'basic' | 'full';
  tradeReplay: boolean;
  brokerSync: boolean;
  customColor: boolean;
  exportData: boolean;
  multiAccountTrade: boolean;
  propFirmHub: 'basic' | 'standard' | 'advanced';
  simulator: boolean;
  heatmapAnalysis: boolean;
  aiFeatures: boolean;
  publicProfile: boolean;
  prioritySupport: boolean;
  allPnLVariants: boolean;
  earlyAccess: boolean;
  founderBadge: boolean;
  discordDirectAccess: boolean;
  roadmapVoting: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyPrice?: number;
  yearlyPrice?: number;   // per-month equivalent when billed annually
  yearlyTotal?: number;
  lifetimePrice?: number;
  savingsPercent?: number;
  highlight?: boolean;    // "most popular" badge
  limit?: number;         // total spots (founder)
  features: PlanFeatures;
}

const freeFeatures: PlanFeatures = {
  maxTradesPerMonth: 60,
  maxNotebookFolders: 3,
  basicAnalytics: true,
  advancedAnalytics: false,
  progressTracker: 'basic',
  tradeReplay: false,
  brokerSync: false,
  customColor: false,
  exportData: false,
  multiAccountTrade: false,
  propFirmHub: 'basic',
  simulator: false,
  heatmapAnalysis: false,
  aiFeatures: false,
  publicProfile: false,
  prioritySupport: false,
  allPnLVariants: false,
  earlyAccess: false,
  founderBadge: false,
  discordDirectAccess: false,
  roadmapVoting: false,
};

const proFeatures: PlanFeatures = {
  ...freeFeatures,
  maxTradesPerMonth: Infinity,
  maxNotebookFolders: Infinity,
  advancedAnalytics: true,
  progressTracker: 'full',
  tradeReplay: true,
  brokerSync: true,
  customColor: true,
  exportData: true,
  multiAccountTrade: true,
  propFirmHub: 'standard',
  prioritySupport: true,
  allPnLVariants: true,
};

const proAiFeatures: PlanFeatures = {
  ...proFeatures,
  propFirmHub: 'advanced',
  simulator: true,
  heatmapAnalysis: true,
  aiFeatures: true,        // enabled when TRACE IA ships
  publicProfile: true,
  earlyAccess: true,
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Gratis',
    tagline: 'Para empezar',
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyTotal: 0,
    features: freeFeatures,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Para traders serios',
    monthlyPrice: 14.99,
    yearlyPrice: 9.92,      // 119 / 12
    yearlyTotal: 119,
    savingsPercent: 34,
    features: proFeatures,
  },
  pro_ai: {
    id: 'pro_ai',
    name: 'Pro AI',
    tagline: 'Todo desbloqueado',
    monthlyPrice: 24.99,
    yearlyPrice: 16.58,     // 199 / 12
    yearlyTotal: 199,
    savingsPercent: 34,
    highlight: true,
    features: proAiFeatures,
  },
  founder: {
    id: 'founder',
    name: 'Founder',
    tagline: 'Pago único, para siempre',
    lifetimePrice: 249,
    limit: 100,
    features: {
      ...proAiFeatures,
      founderBadge: true,
      discordDirectAccess: true,
      roadmapVoting: true,
    },
  },
};

/** Spots left in the Founder deal (localStorage counter until Supabase). */
export function getFounderSpotsRemaining(): number {
  let claimed = 0;
  try { claimed = parseInt(localStorage.getItem('founder_claimed') || '0', 10) || 0; } catch { /* ignore */ }
  return Math.max(0, (PLANS.founder.limit ?? 100) - claimed);
}

export interface PlanFeatures {
  maxTradesPerMonth: number;
  analytics: 'basic' | 'full';
  brokerSync: boolean;
  colorCustomization: boolean;
  aiInsights: boolean;
  multipleAccounts: boolean;
  maxNotebookFolders: number;
  exportData: boolean;
  prioritySupport: boolean;
}

export interface Plan {
  id: 'free' | 'pro';
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyTotal?: number;
  features: PlanFeatures;
}

export const PLANS: Record<'free' | 'pro', Plan> = {
  free: {
    id: 'free',
    name: 'Gratis',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: {
      maxTradesPerMonth: 30,
      analytics: 'basic',
      brokerSync: false,
      colorCustomization: false,
      aiInsights: false,
      multipleAccounts: false,
      maxNotebookFolders: 3,
      exportData: false,
      prioritySupport: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 29,
    yearlyPrice: 19,
    yearlyTotal: 228,
    features: {
      maxTradesPerMonth: Infinity,
      analytics: 'full',
      brokerSync: true,
      colorCustomization: true,
      aiInsights: true,
      multipleAccounts: true,
      maxNotebookFolders: Infinity,
      exportData: true,
      prioritySupport: true,
    },
  },
};

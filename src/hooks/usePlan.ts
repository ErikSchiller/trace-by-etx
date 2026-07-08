import { useAuthStore } from '../store/authStore';
import { PLANS, type PlanFeatures } from '../config/plans';

export function usePlan() {
  const user = useAuthStore(s => s.user);
  // Defensive: any legacy plan value (e.g. 'basic') falls back to 'free'.
  const rawPlan = user?.plan;
  const planId: 'free' | 'pro' =
    rawPlan === 'pro' ? 'pro' : 'free';
  const plan = PLANS[planId];
  const features = plan.features;

  const canDo = (feature: keyof PlanFeatures) => !!features[feature];

  const isAtTradeLimit = (currentCount: number) => {
    if (planId === 'pro') return false;
    return currentCount >= features.maxTradesPerMonth;
  };

  const isAtFolderLimit = (currentCount: number) => {
    if (planId === 'pro') return false;
    return currentCount >= features.maxNotebookFolders;
  };

  return {
    plan: planId,
    planInfo: plan,
    features,
    canDo,
    isAtTradeLimit,
    isAtFolderLimit,
    isPro: planId === 'pro',
    isFree: planId === 'free',
  };
}

import { useAuthStore } from '../store/authStore';
import { PLANS, type PlanFeatures, type PlanId } from '../config/plans';

const VALID: PlanId[] = ['free', 'pro', 'pro_ai', 'founder'];

export function usePlan() {
  const user = useAuthStore(s => s.user);
  // Defensive: any legacy/unknown plan value falls back to 'free'.
  const raw = user?.plan as PlanId | undefined;
  const planId: PlanId = raw && VALID.includes(raw) ? raw : 'free';
  const plan = PLANS[planId];
  const features = plan.features;

  const isPro = planId === 'pro' || planId === 'pro_ai' || planId === 'founder';
  const isProAI = planId === 'pro_ai' || planId === 'founder';

  const canDo = (feature: keyof PlanFeatures) => !!features[feature];

  const isAtTradeLimit = (currentCount: number) => {
    if (isPro) return false;
    return currentCount >= features.maxTradesPerMonth;
  };
  const isAtFolderLimit = (currentCount: number) => {
    if (isPro) return false;
    return currentCount >= features.maxNotebookFolders;
  };

  return {
    plan: planId,
    planInfo: plan,
    features,
    canDo,
    isAtTradeLimit,
    isAtFolderLimit,
    isPro,
    isProAI,
    isFounder: planId === 'founder',
    isFree: planId === 'free',
    hasAI: features.aiFeatures,
  };
}

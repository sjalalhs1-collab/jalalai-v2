export type PlanId = 'free' | 'pro' | 'ultra';
export type BillingPlatform = 'web' | 'android' | 'manual-admin';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  dailyPrompts: number | null;
  priority: 'standard' | 'priority' | 'maximum';
  features: string[];
}

export interface EntitlementSnapshot {
  userId: string;
  planId: PlanId;
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired';
  platform: BillingPlatform | null;
  renewsAt: string | null;
  expiresAt: string | null;
  promptsUsedToday: number;
  dailyPromptLimit: number | null;
}

export interface UsageDecision {
  allowed: boolean;
  reason: 'within_limit' | 'daily_limit_reached' | 'subscription_required' | 'invalid_entitlement';
  remaining: number | null;
}

export function decidePromptUsage(snapshot: EntitlementSnapshot): UsageDecision {
  if (!snapshot.userId || !['free', 'pro', 'ultra'].includes(snapshot.planId)) {
    return {allowed: false, reason: 'invalid_entitlement', remaining: 0};
  }
  if (!['active', 'trialing'].includes(snapshot.status)) {
    return {allowed: false, reason: 'subscription_required', remaining: 0};
  }
  if (snapshot.dailyPromptLimit === null) {
    return {allowed: true, reason: 'within_limit', remaining: null};
  }
  const remaining = Math.max(0, snapshot.dailyPromptLimit - Math.max(0, snapshot.promptsUsedToday));
  return remaining > 0
    ? {allowed: true, reason: 'within_limit', remaining}
    : {allowed: false, reason: 'daily_limit_reached', remaining: 0};
}

export function isValidPlanId(value: unknown): value is PlanId {
  return value === 'free' || value === 'pro' || value === 'ultra';
}

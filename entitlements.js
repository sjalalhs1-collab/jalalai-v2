export function decidePromptUsage(snapshot) {
    if (!snapshot.userId || !['free', 'pro', 'ultra'].includes(snapshot.planId)) {
        return { allowed: false, reason: 'invalid_entitlement', remaining: 0 };
    }
    if (!['active', 'trialing'].includes(snapshot.status)) {
        return { allowed: false, reason: 'subscription_required', remaining: 0 };
    }
    if (snapshot.dailyPromptLimit === null) {
        return { allowed: true, reason: 'within_limit', remaining: null };
    }
    const remaining = Math.max(0, snapshot.dailyPromptLimit - Math.max(0, snapshot.promptsUsedToday));
    return remaining > 0
        ? { allowed: true, reason: 'within_limit', remaining }
        : { allowed: false, reason: 'daily_limit_reached', remaining: 0 };
}
export function isValidPlanId(value) {
    return value === 'free' || value === 'pro' || value === 'ultra';
}

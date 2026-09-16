export function decidePrompt(snapshot) {
    if (!snapshot.userId || snapshot.promptsUsedToday < 0) {
        return { allowed: false, reason: 'invalid_request', plan: snapshot.plan };
    }
    if (snapshot.plan === 'free' && snapshot.dailyPromptLimit !== null && snapshot.promptsUsedToday >= snapshot.dailyPromptLimit) {
        return { allowed: false, reason: 'daily_limit_reached', plan: snapshot.plan };
    }
    if (snapshot.plan !== 'free' && snapshot.activeUntil !== null && Date.parse(snapshot.activeUntil) <= Date.now()) {
        return { allowed: false, reason: 'subscription_inactive', plan: snapshot.plan };
    }
    return { allowed: true, reason: 'allowed', plan: snapshot.plan };
}

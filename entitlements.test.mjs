import test from 'node:test';
import assert from 'node:assert/strict';
import { decidePrompt } from '../dist/production/entitlements.js';

test('free plan allows prompts below the server-side limit', () => {
  assert.deepEqual(decidePrompt({ userId: 'u1', plan: 'free', activeUntil: null, promptsUsedToday: 39, dailyPromptLimit: 40, fairUse: false }), { allowed: true, reason: 'allowed', plan: 'free' });
});

test('free plan blocks the 41st prompt', () => {
  assert.equal(decidePrompt({ userId: 'u1', plan: 'free', activeUntil: null, promptsUsedToday: 40, dailyPromptLimit: 40, fairUse: false }).allowed, false);
});

test('expired paid plan is blocked', () => {
  assert.equal(decidePrompt({ userId: 'u1', plan: 'pro', activeUntil: '2020-01-01T00:00:00Z', promptsUsedToday: 0, dailyPromptLimit: null, fairUse: true }).reason, 'subscription_inactive');
});

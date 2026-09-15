import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { IdentityStore } from '../dist/identity/store.js';
import { IdentityService } from '../dist/identity/service.js';
import { hashPassword, verifyPassword, generateSessionToken, hashToken } from '../dist/identity/crypto.js';

const TEST_DB = './data/test-identity.json';

function freshService() {
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
  const store = new IdentityStore(TEST_DB);
  return new IdentityService(store);
}

test.after(() => {
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
});

test('crypto: password hash+verify round trip, wrong password rejected', () => {
  const stored = hashPassword('correct horse battery staple');
  assert.equal(verifyPassword('correct horse battery staple', stored), true);
  assert.equal(verifyPassword('wrong password', stored), false);
});

test('crypto: session tokens are high-entropy and hashed deterministically', () => {
  const a = generateSessionToken();
  const b = generateSessionToken();
  assert.notEqual(a, b);
  assert.equal(hashToken(a), hashToken(a));
  assert.notEqual(hashToken(a), a);
});

test('identity: register rejects invalid email and weak password', () => {
  const svc = freshService();
  assert.equal(svc.register('not-an-email', 'longenough1').ok, false);
  assert.equal(svc.register('a@b.com', 'short').ok, false);
});

test('identity: register creates a free-plan user and returns a usable session', () => {
  const svc = freshService();
  const result = svc.register('user1@example.com', 'longenough1');
  assert.equal(result.ok, true);
  assert.equal(result.plan, 'free');
  const resolved = svc.resolveSession(result.token);
  assert.equal(resolved.userId, result.userId);
});

test('identity: duplicate email registration is rejected', () => {
  const svc = freshService();
  svc.register('dupe@example.com', 'longenough1');
  const second = svc.register('dupe@example.com', 'longenough2');
  assert.equal(second.ok, false);
  assert.equal(second.reason, 'email_taken');
});

test('identity: login fails for wrong password and unknown email, without leaking which', () => {
  const svc = freshService();
  svc.register('user2@example.com', 'longenough1');
  const badPassword = svc.login('user2@example.com', 'wrongwrong');
  const badEmail = svc.login('nobody@example.com', 'wrongwrong');
  assert.equal(badPassword.ok, false);
  assert.equal(badEmail.ok, false);
  assert.equal(badPassword.reason, 'invalid_credentials');
  assert.equal(badEmail.reason, 'invalid_credentials');
});

test('identity: resolveSession rejects unknown, revoked, and expired tokens', () => {
  const svc = freshService();
  const reg = svc.register('user3@example.com', 'longenough1');
  assert.equal(svc.resolveSession('not-a-real-token'), null);
  svc.logout(reg.token);
  assert.equal(svc.resolveSession(reg.token), null);
});

test('entitlement: free user is blocked after the daily limit and server-side counter enforces it', () => {
  const svc = freshService();
  const reg = svc.register('free@example.com', 'longenough1');
  for (let i = 0; i < 40; i++) {
    const decision = svc.decidePromptForUser(reg.userId);
    assert.equal(decision.allowed, true, `prompt ${i + 1} should be allowed`);
    svc.recordPromptUsage(reg.userId);
  }
  const blocked = svc.decidePromptForUser(reg.userId);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'daily_limit_reached');
});

test('entitlement: admin grant upgrades a user and unlocks fair-use unlimited prompts', () => {
  const svc = freshService();
  const reg = svc.register('upgrade@example.com', 'longenough1');
  const admin = svc.register('admin@example.com', 'longenough1');
  svc.grantPlan(admin.userId, reg.userId, 'pro', { platform: 'web' });
  const decision = svc.decidePromptForUser(reg.userId);
  assert.equal(decision.allowed, true);
  assert.equal(decision.remaining, null);
});

test('entitlement: an expired paid plan is fail-closed and self-heals its status with an audit entry', () => {
  const svc = freshService();
  const reg = svc.register('expired@example.com', 'longenough1');
  svc.grantPlan(reg.userId, reg.userId, 'pro', { expiresAt: '2020-01-01T00:00:00.000Z' });
  const decision = svc.decidePromptForUser(reg.userId);
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'subscription_required');
  const audit = svc.listAudit(reg.userId);
  assert.ok(audit.some((e) => e.type === 'plan_expired'));
});

test('entitlement: suspended accounts cannot authenticate or resolve sessions', () => {
  const svc = freshService();
  const reg = svc.register('suspend@example.com', 'longenough1');
  const admin = svc.register('admin2@example.com', 'longenough1');
  svc.suspendUser(admin.userId, reg.userId);
  assert.equal(svc.resolveSession(reg.token), null);
  const loginAttempt = svc.login('suspend@example.com', 'longenough1');
  assert.equal(loginAttempt.ok, false);
  assert.equal(loginAttempt.reason, 'account_suspended');
});

test('audit: every grant, expiry, and denial produces a traceable log entry', () => {
  const svc = freshService();
  const reg = svc.register('audit@example.com', 'longenough1');
  svc.grantPlan(reg.userId, reg.userId, 'ultra', { platform: 'android' });
  svc.decidePromptForUser(reg.userId);
  const audit = svc.listAudit(reg.userId);
  const types = audit.map((e) => e.type);
  assert.ok(types.includes('user_registered'));
  assert.ok(types.includes('plan_granted'));
  assert.ok(types.includes('prompt_allowed'));
});

test('persistence: a fresh IdentityService instance backed by the same file recovers state', () => {
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
  const store1 = new IdentityStore(TEST_DB);
  const svc1 = new IdentityService(store1);
  const reg = svc1.register('reload@example.com', 'longenough1');

  const store2 = new IdentityStore(TEST_DB).load();
  const svc2 = new IdentityService(store2);
  const resolved = svc2.resolveSession(reg.token);
  assert.equal(resolved.userId, reg.userId);
});

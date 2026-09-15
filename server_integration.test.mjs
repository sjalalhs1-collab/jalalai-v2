import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

import { createHmac } from 'node:crypto';

const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;
const OPERATOR_TOKEN = 'test-operator-token-integration';
const JAZZCASH_SALT = 'test-jazzcash-salt';
const EASYPAISA_SECRET = 'test-easypaisa-secret';
const IDENTITY_DB = './data/test-server-identity.json';
const RUNTIME_DB = './data/test-server-runtime.json';
const WORKFLOW_DB = './data/test-server-workflows.json';

let serverProcess;

function cleanupDataFiles() {
  for (const f of [IDENTITY_DB, RUNTIME_DB, WORKFLOW_DB]) {
    if (existsSync(f)) rmSync(f);
  }
}

async function waitForHealth(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return true;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('server_did_not_start_in_time');
}

test.before(async () => {
  cleanupDataFiles();
  serverProcess = spawn(process.execPath, ['dist/api/server.js'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      JALALAI_API_TOKEN: OPERATOR_TOKEN,
      JALALAI_REQUIRE_AUTH: 'true',
      JALALAI_IDENTITY_PATH: IDENTITY_DB,
      JALALAI_RUNTIME_PATH: RUNTIME_DB,
      JALALAI_WORKFLOW_PATH: WORKFLOW_DB,
      JALALAI_CORS_ORIGIN: `http://127.0.0.1:${PORT}`,
      JALALAI_JAZZCASH_INTEGRITY_SALT: JAZZCASH_SALT,
      JALALAI_JAZZCASH_MERCHANT_ID: 'MC_TEST_123',
      JALALAI_JAZZCASH_PASSWORD: 'test_password',
      JALALAI_JAZZCASH_RETURN_URL: `http://127.0.0.1:${PORT}/pricing.html`,
      JALALAI_EASYPAISA_HASH_KEY: EASYPAISA_SECRET,
    },
    stdio: ['ignore', 'ignore', 'pipe'],
    cwd: process.cwd(),
  });
  await waitForHealth();
});

test.after(() => {
  if (serverProcess) serverProcess.kill();
  cleanupDataFiles();
});

test('integration: /health is reachable without auth', async () => {
  const res = await fetch(`${BASE}/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
});

test('integration: /v1/tasks rejects requests with no operator token and no session', async () => {
  const res = await fetch(`${BASE}/v1/tasks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: 'hello' }),
  });
  assert.equal(res.status, 401);
});

test('integration: register -> login -> /v1/me reflects a free-plan identity', async () => {
  const email = `itest-${Date.now()}@example.com`;
  const registerRes = await fetch(`${BASE}/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'longenough1' }),
  });
  assert.equal(registerRes.status, 201);
  const registered = await registerRes.json();
  assert.equal(registered.plan, 'free');
  assert.ok(registered.token);

  const meRes = await fetch(`${BASE}/v1/me`, {
    headers: { authorization: `Bearer ${registered.token}` },
  });
  assert.equal(meRes.status, 200);
  const me = await meRes.json();
  assert.equal(me.entitlement.planId, 'free');
  assert.equal(me.entitlement.dailyPromptLimit, 40);

  const loginRes = await fetch(`${BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'longenough1' }),
  });
  assert.equal(loginRes.status, 200);
});

test('integration: duplicate registration returns 409', async () => {
  const email = `dupe-itest-${Date.now()}@example.com`;
  const first = await fetch(`${BASE}/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'longenough1' }),
  });
  assert.equal(first.status, 201);
  const second = await fetch(`${BASE}/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'longenough2' }),
  });
  assert.equal(second.status, 409);
});

test('integration: wrong password on login returns 401 and does not leak account existence', async () => {
  const email = `wrongpw-${Date.now()}@example.com`;
  await fetch(`${BASE}/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'longenough1' }),
  });
  const badLogin = await fetch(`${BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'totally-wrong' }),
  });
  assert.equal(badLogin.status, 401);
  const unknownLogin = await fetch(`${BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'nobody-at-all@example.com', password: 'totally-wrong' }),
  });
  assert.equal(unknownLogin.status, 401);
});

test('integration: logout revokes the session token', async () => {
  const email = `logout-itest-${Date.now()}@example.com`;
  const reg = await (
    await fetch(`${BASE}/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'longenough1' }),
    })
  ).json();

  const meBefore = await fetch(`${BASE}/v1/me`, { headers: { authorization: `Bearer ${reg.token}` } });
  assert.equal(meBefore.status, 200);

  const logoutRes = await fetch(`${BASE}/v1/auth/logout`, {
    method: 'POST',
    headers: { authorization: `Bearer ${reg.token}` },
  });
  assert.equal(logoutRes.status, 200);

  const meAfter = await fetch(`${BASE}/v1/me`, { headers: { authorization: `Bearer ${reg.token}` } });
  assert.equal(meAfter.status, 401);
});

test('integration: a free-plan session can run a task via the real /v1/tasks endpoint', async () => {
  const email = `task-itest-${Date.now()}@example.com`;
  const reg = await (
    await fetch(`${BASE}/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'longenough1' }),
    })
  ).json();

  const taskRes = await fetch(`${BASE}/v1/tasks`, {
    method: 'POST',
    headers: { authorization: `Bearer ${reg.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ input: 'Say hello in one short sentence.', mode: 'fast' }),
  });
  assert.equal(taskRes.status, 200);
  const result = await taskRes.json();
  assert.equal(result.status, 'completed');

  const meRes = await fetch(`${BASE}/v1/me`, { headers: { authorization: `Bearer ${reg.token}` } });
  const me = await meRes.json();
  assert.equal(me.entitlement.promptsUsedToday, 1);
});

test('integration: the operator token can still call /v1/tasks with no user session (backward compatible)', async () => {
  const res = await fetch(`${BASE}/v1/tasks`, {
    method: 'POST',
    headers: { authorization: `Bearer ${OPERATOR_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ input: 'Operator smoke test task.', mode: 'fast' }),
  });
  assert.equal(res.status, 200);
});

test('integration: a free-plan user is blocked with 402 once the server-side daily limit is hit', async () => {
  const email = `limit-itest-${Date.now()}@example.com`;
  const reg = await (
    await fetch(`${BASE}/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'longenough1' }),
    })
  ).json();

  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${BASE}/v1/tasks`, {
      method: 'POST',
      headers: { authorization: `Bearer ${reg.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ input: `Prompt number ${i}`, mode: 'fast' }),
    });
    assert.equal(res.status, 200, `prompt ${i + 1} should be allowed`);
  }

  const blockedRes = await fetch(`${BASE}/v1/tasks`, {
    method: 'POST',
    headers: { authorization: `Bearer ${reg.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ input: 'One prompt too many', mode: 'fast' }),
  });
  assert.equal(blockedRes.status, 402);
  const blockedBody = await blockedRes.json();
  assert.equal(blockedBody.error, 'daily_limit_reached');
});

test('integration: admin grant endpoint requires the operator token, then upgrades the plan', async () => {
  const email = `grant-itest-${Date.now()}@example.com`;
  const reg = await (
    await fetch(`${BASE}/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'longenough1' }),
    })
  ).json();

  const unauthorizedGrant = await fetch(`${BASE}/v1/admin/entitlements/grant`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId: reg.userId, planId: 'pro' }),
  });
  assert.equal(unauthorizedGrant.status, 401);

  const grantRes = await fetch(`${BASE}/v1/admin/entitlements/grant`, {
    method: 'POST',
    headers: { authorization: `Bearer ${OPERATOR_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ userId: reg.userId, planId: 'pro', platform: 'web' }),
  });
  assert.equal(grantRes.status, 200);

  const meRes = await fetch(`${BASE}/v1/me`, { headers: { authorization: `Bearer ${reg.token}` } });
  const me = await meRes.json();
  assert.equal(me.entitlement.planId, 'pro');
  assert.equal(me.entitlement.dailyPromptLimit, null);
});

function signJazzCash(fields, salt) {
  const sortedKeys = Object.keys(fields).filter((k) => k.startsWith('pp_')).sort();
  const joined = sortedKeys.map((k) => fields[k]).join('&');
  return createHmac('sha256', salt).update(`${salt}&${joined}`).digest('hex');
}

test('integration: full JazzCash purchase flow — create order, pay, webhook upgrades the plan', async () => {
  const email = `jazzcash-itest-${Date.now()}@example.com`;
  const reg = await (
    await fetch(`${BASE}/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'longenough1' }),
    })
  ).json();

  const orderRes = await fetch(`${BASE}/v1/billing/create-order`, {
    method: 'POST',
    headers: { authorization: `Bearer ${reg.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ planId: 'pro', gateway: 'jazzcash' }),
  });
  assert.equal(orderRes.status, 200);
  const order = await orderRes.json();
  assert.equal(order.amountPkr, 1000);

  const callbackFields = {
    pp_Amount: '100000',
    pp_BillReference: order.orderRef,
    pp_ResponseCode: '000',
    pp_RetreivalReferenceNo: 'RRN123456',
  };
  const hash = signJazzCash(callbackFields, JAZZCASH_SALT);

  const webhookRes = await fetch(`${BASE}/v1/webhooks/jazzcash`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...callbackFields, pp_SecureHash: hash }),
  });
  assert.equal(webhookRes.status, 200);

  const meRes = await fetch(`${BASE}/v1/me`, { headers: { authorization: `Bearer ${reg.token}` } });
  const me = await meRes.json();
  assert.equal(me.entitlement.planId, 'pro');
});

test('integration: JazzCash webhook rejects a tampered/unsigned callback', async () => {
  const res = await fetch(`${BASE}/v1/webhooks/jazzcash`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pp_BillReference: 'order_fake', pp_ResponseCode: '000', pp_SecureHash: 'not-a-real-hash' }),
  });
  assert.equal(res.status, 401);
});

test('integration: Easypaisa webhook upgrades the plan when correctly HMAC-signed', async () => {
  const email = `easypaisa-itest-${Date.now()}@example.com`;
  const reg = await (
    await fetch(`${BASE}/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'longenough1' }),
    })
  ).json();

  const orderRes = await fetch(`${BASE}/v1/billing/create-order`, {
    method: 'POST',
    headers: { authorization: `Bearer ${reg.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ planId: 'ultra', gateway: 'easypaisa' }),
  });
  const order = await orderRes.json();

  const payload = JSON.stringify({ orderRefNum: order.orderRef, status: 'success', transactionId: 'EP-TXN-1' });
  const signature = createHmac('sha256', EASYPAISA_SECRET).update(payload).digest('hex');

  const webhookRes = await fetch(`${BASE}/v1/webhooks/easypaisa`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-easypaisa-signature': signature },
    body: payload,
  });
  assert.equal(webhookRes.status, 200);

  const meRes = await fetch(`${BASE}/v1/me`, { headers: { authorization: `Bearer ${reg.token}` } });
  const me = await meRes.json();
  assert.equal(me.entitlement.planId, 'ultra');
});

test('integration: Easypaisa webhook rejects an unsigned callback', async () => {
  const payload = JSON.stringify({ orderRefNum: 'order_fake', status: 'success', transactionId: 'x' });
  const res = await fetch(`${BASE}/v1/webhooks/easypaisa`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-easypaisa-signature': 'bogus' },
    body: payload,
  });
  assert.equal(res.status, 401);
});

test('integration: create-order requires a logged-in user', async () => {
  const res = await fetch(`${BASE}/v1/billing/create-order`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ planId: 'pro', gateway: 'jazzcash' }),
  });
  assert.equal(res.status, 401);
});

test('integration: JazzCash checkout-form endpoint returns a signed auto-submit form for a pending order', async () => {
  const email = `checkout-itest-${Date.now()}@example.com`;
  const reg = await (
    await fetch(`${BASE}/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'longenough1' }),
    })
  ).json();
  const order = await (
    await fetch(`${BASE}/v1/billing/create-order`, {
      method: 'POST',
      headers: { authorization: `Bearer ${reg.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ planId: 'pro', gateway: 'jazzcash' }),
    })
  ).json();

  const formRes = await fetch(`${BASE}/v1/billing/jazzcash/checkout?orderRef=${order.orderRef}`);
  assert.equal(formRes.status, 200);
  const html = await formRes.text();
  assert.match(html, /pp_MerchantID/);
  assert.match(html, /pp_SecureHash/);
  assert.match(html, new RegExp(order.orderRef));
});

test('integration: JazzCash checkout-form endpoint 404s for an unknown or already-used order', async () => {
  const res = await fetch(`${BASE}/v1/billing/jazzcash/checkout?orderRef=order_does_not_exist`);
  assert.equal(res.status, 404);
});

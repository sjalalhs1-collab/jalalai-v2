import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { verifyJazzCashHash, verifyGenericHmacSignature, buildJazzCashCheckoutFields, computeJazzCashHash } from '../dist/billing/gateways.js';
import { IdentityStore } from '../dist/identity/store.js';
import { IdentityService } from '../dist/identity/service.js';

const TEST_DB = './data/test-billing-identity.json';

function freshService() {
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
  return new IdentityService(new IdentityStore(TEST_DB));
}

test.after(() => {
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
});

function signJazzCash(fields, salt) {
  const sortedKeys = Object.keys(fields).filter((k) => k.startsWith('pp_')).sort();
  const joined = sortedKeys.map((k) => fields[k]).join('&');
  const toHash = `${salt}&${joined}`;
  return createHmac('sha256', salt).update(toHash).digest('hex');
}

test('gateway: JazzCash hash verification accepts a correctly signed callback', () => {
  const salt = 'test-integrity-salt';
  const fields = { pp_Amount: '100000', pp_BillReference: 'order_abc', pp_ResponseCode: '000' };
  const hash = signJazzCash(fields, salt);
  const ok = verifyJazzCashHash({ ...fields, pp_SecureHash: hash }, salt);
  assert.equal(ok, true);
});

test('gateway: JazzCash hash verification rejects a tampered amount', () => {
  const salt = 'test-integrity-salt';
  const fields = { pp_Amount: '100000', pp_BillReference: 'order_abc', pp_ResponseCode: '000' };
  const hash = signJazzCash(fields, salt);
  const tampered = { ...fields, pp_Amount: '900000', pp_SecureHash: hash };
  assert.equal(verifyJazzCashHash(tampered, salt), false);
});

test('gateway: JazzCash hash verification rejects wrong salt', () => {
  const salt = 'real-salt';
  const fields = { pp_Amount: '1000', pp_BillReference: 'order_x', pp_ResponseCode: '000' };
  const hash = signJazzCash(fields, salt);
  assert.equal(verifyJazzCashHash({ ...fields, pp_SecureHash: hash }, 'wrong-salt'), false);
});

test('gateway: JazzCash hash verification rejects missing hash', () => {
  assert.equal(verifyJazzCashHash({ pp_Amount: '1000' }, 'salt'), false);
});

test('gateway: generic HMAC verifier accepts a correctly signed body and rejects tampering', () => {
  const secret = 'shared-secret';
  const body = JSON.stringify({ orderRefNum: 'order_1', status: 'success' });
  const sig = createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(verifyGenericHmacSignature(body, sig, secret), true);
  assert.equal(verifyGenericHmacSignature(body + 'x', sig, secret), false);
  assert.equal(verifyGenericHmacSignature(body, sig, 'wrong-secret'), false);
});

test('orders: create -> fulfill grants the plan exactly once and is idempotent on replay', () => {
  const svc = freshService();
  const reg = svc.register('order-user@example.com', 'longenough1');
  const order = svc.createOrder(reg.userId, 'pro', 'jazzcash');
  assert.equal(order.status, 'pending');
  assert.equal(order.amountPkr, 1000);

  const first = svc.fulfillOrder(order.orderRef, 'TXN123');
  assert.equal(first.ok, true);
  const snapshot = svc.getEntitlementSnapshot(reg.userId);
  assert.equal(snapshot.planId, 'pro');

  // Simulate the gateway re-delivering the same webhook (all real gateways do this).
  const replay = svc.fulfillOrder(order.orderRef, 'TXN123');
  assert.equal(replay.ok, true);
  const snapshotAfterReplay = svc.getEntitlementSnapshot(reg.userId);
  assert.equal(snapshotAfterReplay.planId, 'pro'); // unchanged, not double-applied
});

test('orders: fulfilling an unknown orderRef is rejected, not silently ignored', () => {
  const svc = freshService();
  const result = svc.fulfillOrder('order_does_not_exist', 'TXN1');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'order_not_found');
});

test('orders: rejectOrder marks a pending order failed and never grants a plan', () => {
  const svc = freshService();
  const reg = svc.register('reject-user@example.com', 'longenough1');
  const order = svc.createOrder(reg.userId, 'ultra', 'easypaisa');
  svc.rejectOrder(order.orderRef, 'user_cancelled');
  const fulfillAttempt = svc.fulfillOrder(order.orderRef, 'TXN999');
  assert.equal(fulfillAttempt.ok, false);
  const snapshot = svc.getEntitlementSnapshot(reg.userId);
  assert.equal(snapshot.planId, 'free');
});

test('orders: cannot create an order for the free plan', () => {
  const svc = freshService();
  const reg = svc.register('free-order-user@example.com', 'longenough1');
  assert.throws(() => svc.createOrder(reg.userId, 'free', 'jazzcash'));
});

test('gateway: buildJazzCashCheckoutFields produces a self-consistent, verifiable signature', () => {
  const config = { merchantId: 'MC12345', password: 'testpass', integritySalt: 'test-salt', returnUrl: 'https://example.com/return' };
  const order = { orderRef: 'order_abcdef1234567890', amountPkr: 1000 };
  const fields = buildJazzCashCheckoutFields(order, config);

  assert.equal(fields.pp_MerchantID, 'MC12345');
  assert.equal(fields.pp_BillReference, order.orderRef);
  assert.equal(fields.pp_Amount, '100000'); // 1000 PKR -> 100000 paisa
  assert.equal(fields.pp_TxnCurrency, 'PKR');
  assert.ok(fields.pp_SecureHash);

  // The outbound hash must itself pass the inbound verifier — same algorithm both ways.
  assert.equal(verifyJazzCashHash(fields, config.integritySalt), true);
});

test('gateway: computeJazzCashHash is deterministic for the same fields and salt', () => {
  const fields = { pp_Amount: '500', pp_BillReference: 'order_z' };
  const salt = 'abc';
  assert.equal(computeJazzCashHash(fields, salt), computeJazzCashHash(fields, salt));
});

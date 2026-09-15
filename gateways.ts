import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Shared JazzCash hash computation, per their public merchant integration guide:
 * every `pp_` field (excluding pp_SecureHash) is sorted alphabetically by key, its
 * values joined with `&`, the merchant's Integrity Salt prepended, and the result
 * HMAC-SHA256 signed using the Integrity Salt as the key.
 *
 * Used both to verify inbound callbacks and to sign outbound checkout-initiation
 * requests — JazzCash uses the identical algorithm for both directions.
 */
export function computeJazzCashHash(fields: Record<string, string>, integritySalt: string): string {
  const sortedKeys = Object.keys(fields)
    .filter((k) => k.startsWith('pp_') && fields[k] !== undefined && fields[k] !== '')
    .sort();
  const joined = sortedKeys.map((k) => fields[k]).join('&');
  const toHash = `${integritySalt}&${joined}`;
  return createHmac('sha256', integritySalt).update(toHash).digest('hex');
}

/**
 * JazzCash Hosted Checkout callback verification.
 *
 * This implements JazzCash's published algorithm exactly. It has NOT been tested
 * against a real JazzCash sandbox account (no merchant credentials were available
 * while building this) — verify against JazzCash's sandbox before relying on it
 * in production.
 */
export function verifyJazzCashHash(fields: Record<string, string>, integritySalt: string): boolean {
  if (!integritySalt) return false;
  const { pp_SecureHash: providedHash, ...rest } = fields;
  if (!providedHash) return false;
  const computed = computeJazzCashHash(rest, integritySalt);
  return constantTimeHexEqual(computed, providedHash);
}

export interface JazzCashMerchantConfig {
  merchantId: string;
  password: string;
  integritySalt: string;
  returnUrl: string;
}

/**
 * Builds a signed JazzCash Hosted Checkout (Mobile Wallet / Page Redirection v1.1)
 * field set for a pending order, ready to be POSTed (via an auto-submitting HTML
 * form) to JazzCash's checkout URL. Amount is converted to paisa (JazzCash's
 * documented unit) since orders are tracked in whole PKR internally.
 *
 * NOT verified against a live JazzCash sandbox account — the field names and
 * format match their published Hosted Checkout guide, but confirm against a real
 * sandbox transaction before going live.
 */
export function buildJazzCashCheckoutFields(
  order: { orderRef: string; amountPkr: number },
  config: JazzCashMerchantConfig,
): Record<string, string> {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const txnDateTime = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const expiry = new Date(now.getTime() + 30 * 60 * 1000);
  const txnExpiry = `${expiry.getFullYear()}${pad(expiry.getMonth() + 1)}${pad(expiry.getDate())}${pad(expiry.getHours())}${pad(expiry.getMinutes())}${pad(expiry.getSeconds())}`;
  // JazzCash pp_TxnRefNo has a short length limit in practice; the full order is looked
  // up via pp_BillReference instead, so this only needs to be unique, not reversible.
  const txnRefNo = order.orderRef.replace('order_', 'T').slice(0, 20);

  const fields: Record<string, string> = {
    pp_Version: '1.1',
    pp_TxnType: 'MWALLET',
    pp_MerchantID: config.merchantId,
    pp_Password: config.password,
    pp_TxnRefNo: txnRefNo,
    pp_Amount: String(Math.round(order.amountPkr * 100)),
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: txnDateTime,
    pp_TxnExpiryDateTime: txnExpiry,
    pp_BillReference: order.orderRef,
    pp_Description: 'JalalAI subscription upgrade',
    pp_ReturnURL: config.returnUrl,
    pp_Language: 'EN',
  };
  fields.pp_SecureHash = computeJazzCashHash(fields, config.integritySalt);
  return fields;
}

/**
 * Generic HMAC-SHA256 webhook verifier for gateways (e.g. Easypaisa, Stripe-style
 * providers) that sign a raw request body with a shared secret and send the signature
 * in a header. Confirm the exact header name and signing scheme against the specific
 * gateway's current merchant documentation before using this in production — Easypaisa's
 * hashing scheme varies by integration type (Hosted Checkout vs Open API) and was not
 * confirmed against a live merchant account while building this.
 */
export function verifyGenericHmacSignature(rawBody: string, providedSignatureHex: string, secret: string): boolean {
  if (!secret || !providedSignatureHex) return false;
  const computed = createHmac('sha256', secret).update(rawBody).digest('hex');
  return constantTimeHexEqual(computed, providedSignatureHex);
}

function constantTimeHexEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a.toLowerCase(), 'hex');
  const bufB = Buffer.from(b.toLowerCase(), 'hex');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

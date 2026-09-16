import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
// scrypt cost parameters. N=16384 is the OWASP-recommended minimum for interactive login in 2024+.
const KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
/** Hash a plaintext password with a fresh random salt. Never store plaintext passwords. */
export function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, KEYLEN, SCRYPT_PARAMS).toString('hex');
    return { hash, salt };
}
/** Constant-time verification of a plaintext password against a stored hash+salt. */
export function verifyPassword(password, stored) {
    const actual = scryptSync(password, stored.salt, KEYLEN, SCRYPT_PARAMS);
    const expected = Buffer.from(stored.hash, 'hex');
    if (actual.length !== expected.length)
        return false;
    return timingSafeEqual(actual, expected);
}
/** Generate a high-entropy random session token (returned to the client once). */
export function generateSessionToken() {
    return randomBytes(32).toString('hex');
}
/**
 * Session tokens are random and high-entropy, so a fast SHA-256 digest is sufficient
 * for at-rest storage (unlike passwords, they are not guessable/brute-forceable offline).
 * We never store the raw token; only this digest.
 */
export function hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
}
export function constantTimeStringEqual(a, b) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
        // Still run a comparison of equal length to avoid trivial length-based timing signal.
        timingSafeEqual(bufA, bufA);
        return false;
    }
    return timingSafeEqual(bufA, bufB);
}
export function generateId(prefix) {
    return `${prefix}_${randomBytes(12).toString('hex')}`;
}

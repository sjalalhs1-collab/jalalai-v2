import { IdentityStore } from './store.js';
import { hashPassword, verifyPassword, generateSessionToken, hashToken, generateId } from './crypto.js';
import { decidePromptUsage } from '../billing/entitlements.js';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ORDER_TTL_MS = 30 * 60 * 1000; // 30 minutes to complete a payment
const PLAN_DAILY_LIMIT = { free: 40, pro: null, ultra: null };
const PLAN_PRICE_PKR_MONTHLY = { free: 0, pro: 1000, ultra: 3000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function todayUTC() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}
export class IdentityService {
    store;
    constructor(store = new IdentityStore()) {
        this.store = store;
    }
    load() {
        this.store.load();
        return this;
    }
    audit(type, userId, actorId, detail = {}) {
        this.store.appendAudit({ id: generateId('audit'), ts: new Date().toISOString(), type, userId, actorId, detail });
    }
    register(email, password) {
        if (!EMAIL_RE.test(email))
            return { ok: false, reason: 'invalid_email' };
        if (typeof password !== 'string' || password.length < 8)
            return { ok: false, reason: 'weak_password' };
        if (this.store.getUserByEmail(email))
            return { ok: false, reason: 'email_taken' };
        const { hash, salt } = hashPassword(password);
        const user = {
            id: generateId('user'),
            email,
            passwordHash: hash,
            passwordSalt: salt,
            role: 'user',
            accountStatus: 'active',
            createdAt: new Date().toISOString(),
        };
        this.store.putUser(user);
        const plan = {
            userId: user.id,
            planId: 'free',
            status: 'active',
            platform: null,
            renewsAt: null,
            expiresAt: null,
            updatedAt: user.createdAt,
        };
        this.store.putPlan(plan);
        this.audit('user_registered', user.id, user.id, { email });
        const token = this.issueSession(user.id);
        return { ok: true, userId: user.id, token, plan: 'free' };
    }
    login(email, password) {
        const user = this.store.getUserByEmail(email);
        if (!user) {
            this.audit('login_failed', null, null, { email, reason: 'no_such_user' });
            return { ok: false, reason: 'invalid_credentials' };
        }
        if (user.accountStatus === 'suspended') {
            this.audit('login_failed', user.id, user.id, { reason: 'account_suspended' });
            return { ok: false, reason: 'account_suspended' };
        }
        const valid = verifyPassword(password, { hash: user.passwordHash, salt: user.passwordSalt });
        if (!valid) {
            this.audit('login_failed', user.id, user.id, { reason: 'bad_password' });
            return { ok: false, reason: 'invalid_credentials' };
        }
        this.audit('login_success', user.id, user.id, {});
        const token = this.issueSession(user.id);
        const plan = this.store.getPlan(user.id);
        return { ok: true, userId: user.id, token, plan: plan?.planId ?? 'free' };
    }
    issueSession(userId) {
        const token = generateSessionToken();
        const now = Date.now();
        this.store.putSession({
            tokenHash: hashToken(token),
            userId,
            createdAt: new Date(now).toISOString(),
            expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
        });
        return token;
    }
    /** Resolve a raw bearer token to a user identity. Returns null for missing/expired/unknown tokens. */
    resolveSession(rawToken) {
        if (!rawToken)
            return null;
        const session = this.store.getSession(hashToken(rawToken));
        if (!session)
            return null;
        if (Date.parse(session.expiresAt) <= Date.now())
            return null;
        const user = this.store.getUserById(session.userId);
        if (!user || user.accountStatus !== 'active')
            return null;
        return { userId: user.id, role: user.role };
    }
    logout(rawToken) {
        if (!rawToken)
            return;
        const tokenHash = hashToken(rawToken);
        const session = this.store.getSession(tokenHash);
        if (session)
            this.audit('session_revoked', session.userId, session.userId, {});
        this.store.deleteSession(tokenHash);
    }
    /** Loads (and self-heals expiry transitions on) a user's plan record, defaulting to free. */
    effectivePlan(userId) {
        const existing = this.store.getPlan(userId);
        const plan = existing ?? {
            userId,
            planId: 'free',
            status: 'active',
            platform: null,
            renewsAt: null,
            expiresAt: null,
            updatedAt: new Date().toISOString(),
        };
        if (plan.status === 'active' && plan.expiresAt && Date.parse(plan.expiresAt) <= Date.now()) {
            plan.status = 'expired';
            plan.updatedAt = new Date().toISOString();
            this.store.putPlan(plan);
            this.audit('plan_expired', userId, null, { planId: plan.planId, expiresAt: plan.expiresAt });
        }
        return plan;
    }
    getEntitlementSnapshot(userId) {
        const plan = this.effectivePlan(userId);
        const day = todayUTC();
        const usage = this.store.getUsage(userId, day);
        return {
            userId,
            planId: plan.planId,
            status: plan.status,
            platform: plan.platform,
            renewsAt: plan.renewsAt,
            expiresAt: plan.expiresAt,
            promptsUsedToday: usage?.promptsUsedToday ?? 0,
            dailyPromptLimit: PLAN_DAILY_LIMIT[plan.planId],
        };
    }
    /** Server-side gate: call BEFORE executing an expensive model request. */
    decidePromptForUser(userId) {
        const snapshot = this.getEntitlementSnapshot(userId);
        const decision = decidePromptUsage(snapshot);
        this.audit(decision.allowed ? 'prompt_allowed' : 'prompt_denied', userId, userId, {
            reason: decision.reason,
            plan: snapshot.planId,
            promptsUsedToday: snapshot.promptsUsedToday,
        });
        return decision;
    }
    /** Call AFTER a prompt allowed by decidePromptForUser has actually been accepted for execution. */
    recordPromptUsage(userId) {
        const day = todayUTC();
        const current = this.store.getUsage(userId, day);
        this.store.putUsage({ userId, dayUTC: day, promptsUsedToday: (current?.promptsUsedToday ?? 0) + 1 });
    }
    /** Admin-only: grant or change a user's plan. Every call is audit logged with the acting operator. */
    grantPlan(actorId, userId, planId, opts = {}) {
        const plan = {
            userId,
            planId,
            status: 'active',
            platform: opts.platform ?? null,
            renewsAt: opts.renewsAt ?? null,
            expiresAt: opts.expiresAt ?? null,
            updatedAt: new Date().toISOString(),
        };
        this.store.putPlan(plan);
        this.audit('plan_granted', userId, actorId, { planId, platform: plan.platform, expiresAt: plan.expiresAt });
        return plan;
    }
    /** Admin-only: suspend a user account and revoke all their capability to authenticate further. */
    suspendUser(actorId, userId) {
        const user = this.store.getUserById(userId);
        if (!user)
            throw new Error('user_not_found');
        user.accountStatus = 'suspended';
        this.store.putUser(user);
        this.audit('plan_suspended', userId, actorId, {});
    }
    isAdmin(userId) {
        return this.store.getUserById(userId)?.role === 'admin';
    }
    /** Called when a logged-in user clicks "Upgrade" — creates a pending order to hand to a payment gateway. */
    createOrder(userId, planId, gateway) {
        if (planId === 'free')
            throw new Error('cannot_create_order_for_free_plan');
        const now = Date.now();
        const order = {
            orderRef: generateId('order'),
            userId,
            planId,
            amountPkr: PLAN_PRICE_PKR_MONTHLY[planId],
            gateway,
            status: 'pending',
            createdAt: new Date(now).toISOString(),
            expiresAt: new Date(now + ORDER_TTL_MS).toISOString(),
            fulfilledAt: null,
            gatewayTxnId: null,
        };
        this.store.putOrder(order);
        this.audit('order_created', userId, userId, { orderRef: order.orderRef, planId, amountPkr: order.amountPkr, gateway });
        return order;
    }
    getOrder(orderRef) {
        return this.store.getOrder(orderRef);
    }
    /**
     * Called ONLY after a gateway's signature has been cryptographically verified
     * (see src/billing/gateways.ts). Idempotent: calling this twice for an
     * already-fulfilled order with the same orderRef is a safe no-op success,
     * so duplicate webhook deliveries (which all real gateways can send) don't
     * grant a plan twice or throw.
     */
    fulfillOrder(orderRef, gatewayTxnId) {
        const order = this.store.getOrder(orderRef);
        if (!order)
            return { ok: false, reason: 'order_not_found' };
        if (order.status === 'fulfilled')
            return { ok: true }; // idempotent replay
        if (order.status !== 'pending')
            return { ok: false, reason: `order_${order.status}` };
        if (Date.parse(order.expiresAt) <= Date.now()) {
            order.status = 'expired';
            this.store.putOrder(order);
            this.audit('order_rejected', order.userId, null, { orderRef, reason: 'expired' });
            return { ok: false, reason: 'order_expired' };
        }
        order.status = 'fulfilled';
        order.fulfilledAt = new Date().toISOString();
        order.gatewayTxnId = gatewayTxnId;
        this.store.putOrder(order);
        this.grantPlan(`gateway:${order.gateway}`, order.userId, order.planId, { platform: 'web' });
        this.audit('order_fulfilled', order.userId, null, { orderRef, gatewayTxnId, planId: order.planId, gateway: order.gateway });
        return { ok: true };
    }
    rejectOrder(orderRef, reason) {
        const order = this.store.getOrder(orderRef);
        if (!order || order.status !== 'pending')
            return;
        order.status = 'failed';
        this.store.putOrder(order);
        this.audit('order_rejected', order.userId, null, { orderRef, reason });
    }
    listAudit(userId) {
        return this.store.listAudit(userId);
    }
}

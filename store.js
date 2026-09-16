import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
function parent(p) {
    const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
    return i > 0 ? p.slice(0, i) : '.';
}
/**
 * File-backed store for identity, entitlement and audit records.
 *
 * NOT PRODUCTION-COMPLETE (see docs/GATE_B_IDENTITY_ENTITLEMENTS.md and Gate A of
 * NEXT_LEVEL_EXECUTION_BACKLOG.md): this is a single-process JSON file, not a
 * managed, replicated database. It is safe for single-instance deployments and
 * local/dev/test use, and gives every method a narrow interface so a future
 * PostgreSQL-backed implementation can be swapped in without touching callers.
 * Concurrent multi-instance writes are NOT safe with this implementation.
 */
export class IdentityStore {
    path;
    users = new Map();
    emailIndex = new Map(); // lowercase email -> userId
    sessions = new Map(); // tokenHash -> session
    plans = new Map(); // userId -> plan
    usage = new Map(); // `${userId}:${dayUTC}` -> counter
    orders = new Map(); // orderRef -> order
    auditLog = [];
    constructor(path = process.env.JALALAI_IDENTITY_PATH ?? './data/jalalai-identity.json') {
        this.path = path;
    }
    load() {
        try {
            if (existsSync(this.path)) {
                const raw = JSON.parse(readFileSync(this.path, 'utf8'));
                for (const u of raw.users ?? []) {
                    this.users.set(u.id, u);
                    this.emailIndex.set(u.email.toLowerCase(), u.id);
                }
                for (const s of raw.sessions ?? [])
                    this.sessions.set(s.tokenHash, s);
                for (const p of raw.plans ?? [])
                    this.plans.set(p.userId, p);
                for (const c of raw.usage ?? [])
                    this.usage.set(`${c.userId}:${c.dayUTC}`, c);
                for (const o of raw.orders ?? [])
                    this.orders.set(o.orderRef, o);
                this.auditLog = raw.auditLog ?? [];
            }
        }
        catch {
            // Corrupt or missing file: start from an empty, fail-closed state rather than throwing.
        }
        return this;
    }
    persist() {
        try {
            mkdirSync(parent(this.path), { recursive: true });
            const data = {
                users: [...this.users.values()],
                sessions: [...this.sessions.values()],
                plans: [...this.plans.values()],
                usage: [...this.usage.values()],
                orders: [...this.orders.values()],
                auditLog: this.auditLog,
            };
            writeFileSync(this.path, JSON.stringify(data, null, 2));
        }
        catch {
            // Best-effort persistence, matching existing WorkflowManager behavior in this codebase.
        }
    }
    // --- users ---
    getUserById(id) {
        return this.users.get(id);
    }
    getUserByEmail(email) {
        const id = this.emailIndex.get(email.toLowerCase());
        return id ? this.users.get(id) : undefined;
    }
    putUser(user) {
        this.users.set(user.id, user);
        this.emailIndex.set(user.email.toLowerCase(), user.id);
        this.persist();
    }
    // --- sessions ---
    putSession(session) {
        this.sessions.set(session.tokenHash, session);
        this.persist();
    }
    getSession(tokenHash) {
        return this.sessions.get(tokenHash);
    }
    deleteSession(tokenHash) {
        this.sessions.delete(tokenHash);
        this.persist();
    }
    // --- plans ---
    getPlan(userId) {
        return this.plans.get(userId);
    }
    putPlan(plan) {
        this.plans.set(plan.userId, plan);
        this.persist();
    }
    // --- usage ---
    getUsage(userId, dayUTC) {
        return this.usage.get(`${userId}:${dayUTC}`);
    }
    putUsage(counter) {
        this.usage.set(`${counter.userId}:${counter.dayUTC}`, counter);
        this.persist();
    }
    // --- orders ---
    getOrder(orderRef) {
        return this.orders.get(orderRef);
    }
    putOrder(order) {
        this.orders.set(order.orderRef, order);
        this.persist();
    }
    listOrders(userId) {
        const items = [...this.orders.values()];
        return userId ? items.filter((o) => o.userId === userId) : items;
    }
    // --- audit log (append-only) ---
    appendAudit(entry) {
        this.auditLog.push(entry);
        this.persist();
    }
    listAudit(userId) {
        const items = userId ? this.auditLog.filter((e) => e.userId === userId) : this.auditLog;
        return [...items].sort((a, b) => a.ts.localeCompare(b.ts));
    }
}

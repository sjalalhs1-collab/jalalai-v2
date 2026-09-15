import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import type {
  IdentityStoreData,
  UserRecord,
  SessionRecord,
  PlanRecord,
  UsageCounterRecord,
  AuditLogEntry,
  PendingOrderRecord,
} from './types.js';

function parent(p: string): string {
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
  private users = new Map<string, UserRecord>();
  private emailIndex = new Map<string, string>(); // lowercase email -> userId
  private sessions = new Map<string, SessionRecord>(); // tokenHash -> session
  private plans = new Map<string, PlanRecord>(); // userId -> plan
  private usage = new Map<string, UsageCounterRecord>(); // `${userId}:${dayUTC}` -> counter
  private orders = new Map<string, PendingOrderRecord>(); // orderRef -> order
  private auditLog: AuditLogEntry[] = [];

  constructor(private path = process.env.JALALAI_IDENTITY_PATH ?? './data/jalalai-identity.json') {}

  load(): this {
    try {
      if (existsSync(this.path)) {
        const raw = JSON.parse(readFileSync(this.path, 'utf8')) as Partial<IdentityStoreData>;
        for (const u of raw.users ?? []) {
          this.users.set(u.id, u);
          this.emailIndex.set(u.email.toLowerCase(), u.id);
        }
        for (const s of raw.sessions ?? []) this.sessions.set(s.tokenHash, s);
        for (const p of raw.plans ?? []) this.plans.set(p.userId, p);
        for (const c of raw.usage ?? []) this.usage.set(`${c.userId}:${c.dayUTC}`, c);
        for (const o of raw.orders ?? []) this.orders.set(o.orderRef, o);
        this.auditLog = raw.auditLog ?? [];
      }
    } catch {
      // Corrupt or missing file: start from an empty, fail-closed state rather than throwing.
    }
    return this;
  }

  private persist(): void {
    try {
      mkdirSync(parent(this.path), { recursive: true });
      const data: IdentityStoreData = {
        users: [...this.users.values()],
        sessions: [...this.sessions.values()],
        plans: [...this.plans.values()],
        usage: [...this.usage.values()],
        orders: [...this.orders.values()],
        auditLog: this.auditLog,
      };
      writeFileSync(this.path, JSON.stringify(data, null, 2));
    } catch {
      // Best-effort persistence, matching existing WorkflowManager behavior in this codebase.
    }
  }

  // --- users ---
  getUserById(id: string): UserRecord | undefined {
    return this.users.get(id);
  }
  getUserByEmail(email: string): UserRecord | undefined {
    const id = this.emailIndex.get(email.toLowerCase());
    return id ? this.users.get(id) : undefined;
  }
  putUser(user: UserRecord): void {
    this.users.set(user.id, user);
    this.emailIndex.set(user.email.toLowerCase(), user.id);
    this.persist();
  }

  // --- sessions ---
  putSession(session: SessionRecord): void {
    this.sessions.set(session.tokenHash, session);
    this.persist();
  }
  getSession(tokenHash: string): SessionRecord | undefined {
    return this.sessions.get(tokenHash);
  }
  deleteSession(tokenHash: string): void {
    this.sessions.delete(tokenHash);
    this.persist();
  }

  // --- plans ---
  getPlan(userId: string): PlanRecord | undefined {
    return this.plans.get(userId);
  }
  putPlan(plan: PlanRecord): void {
    this.plans.set(plan.userId, plan);
    this.persist();
  }

  // --- usage ---
  getUsage(userId: string, dayUTC: string): UsageCounterRecord | undefined {
    return this.usage.get(`${userId}:${dayUTC}`);
  }
  putUsage(counter: UsageCounterRecord): void {
    this.usage.set(`${counter.userId}:${counter.dayUTC}`, counter);
    this.persist();
  }

  // --- orders ---
  getOrder(orderRef: string): PendingOrderRecord | undefined {
    return this.orders.get(orderRef);
  }
  putOrder(order: PendingOrderRecord): void {
    this.orders.set(order.orderRef, order);
    this.persist();
  }
  listOrders(userId?: string): PendingOrderRecord[] {
    const items = [...this.orders.values()];
    return userId ? items.filter((o) => o.userId === userId) : items;
  }

  // --- audit log (append-only) ---
  appendAudit(entry: AuditLogEntry): void {
    this.auditLog.push(entry);
    this.persist();
  }
  listAudit(userId?: string): AuditLogEntry[] {
    const items = userId ? this.auditLog.filter((e) => e.userId === userId) : this.auditLog;
    return [...items].sort((a, b) => a.ts.localeCompare(b.ts));
  }
}

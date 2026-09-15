export type PlanId = 'free' | 'pro' | 'ultra';
export type BillingPlatform = 'web' | 'android' | 'manual-admin';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired';
export type UserRole = 'user' | 'admin';
export type UserAccountStatus = 'active' | 'suspended';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: UserRole;
  accountStatus: UserAccountStatus;
  createdAt: string;
}

export interface SessionRecord {
  /** SHA-256 digest of the raw session token. The raw token is never persisted. */
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface PlanRecord {
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  platform: BillingPlatform | null;
  renewsAt: string | null;
  expiresAt: string | null;
  updatedAt: string;
}

export interface UsageCounterRecord {
  userId: string;
  /** UTC calendar day this counter applies to, formatted YYYY-MM-DD. */
  dayUTC: string;
  promptsUsedToday: number;
}

export type AuditEventType =
  | 'user_registered'
  | 'login_success'
  | 'login_failed'
  | 'session_revoked'
  | 'plan_granted'
  | 'plan_renewed'
  | 'plan_expired'
  | 'plan_suspended'
  | 'admin_override'
  | 'prompt_allowed'
  | 'prompt_denied'
  | 'order_created'
  | 'order_fulfilled'
  | 'order_rejected';

export interface AuditLogEntry {
  id: string;
  ts: string;
  type: AuditEventType;
  userId: string | null;
  actorId: string | null;
  detail: Record<string, unknown>;
}

export type OrderStatus = 'pending' | 'fulfilled' | 'failed' | 'expired';
export type PaymentGateway = 'jazzcash' | 'easypaisa' | 'manual-admin';

export interface PendingOrderRecord {
  orderRef: string;
  userId: string;
  planId: PlanId;
  amountPkr: number;
  gateway: PaymentGateway;
  status: OrderStatus;
  createdAt: string;
  expiresAt: string;
  fulfilledAt: string | null;
  /** Raw gateway transaction id once confirmed, for reconciliation/audit. */
  gatewayTxnId: string | null;
}

export interface IdentityStoreData {
  users: UserRecord[];
  sessions: SessionRecord[];
  plans: PlanRecord[];
  usage: UsageCounterRecord[];
  auditLog: AuditLogEntry[];
  orders: PendingOrderRecord[];
}

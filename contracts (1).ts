/** Production-boundary contracts.
 * These are provider-neutral interfaces; implementations must be injected by deployment.
 */
export type PlanId = 'free' | 'pro' | 'ultra';
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface UserIdentity {
  userId: string;
  email: string;
  roles: string[];
  mfaVerified: boolean;
}

export interface Entitlement {
  userId: string;
  plan: PlanId;
  aiPromptsPerDay: number | 'fair-use-unlimited';
  validUntil: string | null;
  source: 'internal' | 'web-gateway' | 'google-play';
  externalPurchaseId?: string;
}

export interface TaskRecord {
  taskId: string;
  userId: string;
  projectId?: string;
  status: TaskStatus;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  errorCode?: string;
}

export interface PermissionDecision {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
  scope: string;
}

export interface ProductionAdapters {
  authenticate(token: string): Promise<UserIdentity | null>;
  getEntitlement(userId: string): Promise<Entitlement>;
  enqueue(task: TaskRecord): Promise<void>;
  authorize(identity: UserIdentity, action: string, resource?: string): Promise<PermissionDecision>;
}

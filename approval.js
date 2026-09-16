export class ApprovalGate {
    items = new Map();
    request(jobId, action, reason) { const id = `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; const x = { id, jobId, action, reason, createdAt: Date.now(), status: 'pending' }; this.items.set(id, x); return x; }
    list() { return [...this.items.values()].sort((a, b) => b.createdAt - a.createdAt); }
    get(id) { return this.items.get(id); }
    decide(id, approved, reason) { const x = this.items.get(id); if (!x)
        throw new Error('approval_not_found'); x.status = approved ? 'approved' : 'rejected'; x.decidedAt = Date.now(); x.decisionReason = reason; return x; }
}

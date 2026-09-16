import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
function parent(p) { const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')); return i > 0 ? p.slice(0, i) : '.'; }
export class ProductionRuntime {
    handler;
    path;
    concurrency;
    defaultMaxAttempts;
    jobs = new Map();
    approvals = new Map();
    queue = [];
    active = 0;
    waiters = new Map();
    constructor(handler, path = process.env.JALALAI_RUNTIME_PATH ?? './data/jalalai-runtime.json', concurrency = Math.max(1, Math.min(16, Number(process.env.JALALAI_WORKERS ?? 4))), defaultMaxAttempts = 3) {
        this.handler = handler;
        this.path = path;
        this.concurrency = concurrency;
        this.defaultMaxAttempts = defaultMaxAttempts;
    }
    async load() { try {
        if (existsSync(this.path)) {
            const raw = JSON.parse(readFileSync(this.path, 'utf8'));
            for (const j of raw?.jobs ?? [])
                this.jobs.set(j.id, j);
            for (const a of raw?.approvals ?? [])
                this.approvals.set(a.jobId, a);
            this.queue = [...(raw?.queue ?? [])].filter((id) => this.jobs.get(id)?.status === 'queued' || this.jobs.get(id)?.status === 'awaiting_approval');
            for (const j of this.jobs.values())
                if (j.status === 'running') {
                    j.status = 'queued';
                    j.updatedAt = Date.now();
                    this.queue.push(j.id);
                }
        }
    }
    catch { } await this.persist(); this.pump(); return this; }
    async persist() { try {
        mkdirSync(parent(this.path), { recursive: true });
        writeFileSync(this.path, JSON.stringify({ jobs: [...this.jobs.values()], approvals: [...this.approvals.values()], queue: this.queue }, null, 2));
    }
    catch { } }
    enqueue(id, requireApproval = false, maxAttempts = this.defaultMaxAttempts, metadata = {}) { if (this.jobs.has(id))
        throw new Error('runtime_job_exists'); const now = Date.now(); const job = { id, status: requireApproval ? 'awaiting_approval' : 'queued', createdAt: now, updatedAt: now, attempts: 0, maxAttempts: Math.max(1, Math.min(5, maxAttempts)), requireApproval }; Object.assign(job, metadata); this.jobs.set(id, job); if (requireApproval)
        this.approvals.set(id, { jobId: id, createdAt: now, status: 'pending' });
    else
        this.queue.push(id); void this.persist(); this.pump(); return job; }
    pump() { while (this.active < this.concurrency && this.queue.length) {
        const id = this.queue.shift();
        const job = this.jobs.get(id);
        if (!job || job.status !== 'queued')
            continue;
        void this.run(job);
    } }
    async run(job) { this.active++; job.status = 'running'; job.startedAt = Date.now(); job.updatedAt = Date.now(); job.attempts++; await this.persist(); const controller = new AbortController(); job._controller = controller; try {
        job.result = await this.handler(job, controller.signal);
        job.status = 'completed';
        job.finishedAt = Date.now();
        job.updatedAt = Date.now();
        this.resolve(job.id, job.result);
    }
    catch (e) {
        job.error = e instanceof Error ? e.message : String(e);
        job.updatedAt = Date.now();
        if (job.error === 'task_cancelled') {
            job.status = 'cancelled';
            job.finishedAt = Date.now();
        }
        else if (job.attempts < job.maxAttempts) {
            job.status = 'queued';
            this.queue.push(job.id);
        }
        else {
            job.status = 'failed';
            job.finishedAt = Date.now();
        }
        if (job.status === 'failed' || job.status === 'cancelled')
            this.rejectWait(job.id, new Error(job.error));
    }
    finally {
        delete job._controller;
        this.active--;
        await this.persist();
        this.pump();
    } }
    approve(id, reason) { const j = this.jobs.get(id); const a = this.approvals.get(id); if (!j || !a)
        throw new Error('approval_not_found'); if (a.status !== 'pending')
        return j; a.status = 'approved'; a.approvedAt = Date.now(); a.reason = reason; j.status = 'queued'; j.updatedAt = Date.now(); this.queue.push(id); void this.persist(); this.pump(); return j; }
    reject(id, reason = 'rejected') { const j = this.jobs.get(id); const a = this.approvals.get(id); if (!j || !a)
        throw new Error('approval_not_found'); a.status = 'rejected'; a.rejectedAt = Date.now(); a.reason = reason; j.status = 'failed'; j.error = reason; j.finishedAt = Date.now(); j.updatedAt = Date.now(); void this.persist(); this.rejectWait(id, new Error(reason)); return j; }
    cancel(id) { const j = this.jobs.get(id); if (!j)
        throw new Error('runtime_job_not_found'); if (j.status === 'running' && j._controller)
        j._controller.abort();
    else if (j.status === 'queued' || j.status === 'awaiting_approval') {
        j.status = 'cancelled';
        j.finishedAt = Date.now();
        j.updatedAt = Date.now();
        this.queue = this.queue.filter(x => x !== id);
        this.rejectWait(id, new Error('task_cancelled'));
        void this.persist();
    } return j; }
    wait(id, timeoutMs = 0) { const j = this.jobs.get(id); if (!j)
        return Promise.reject(new Error('runtime_job_not_found')); if (j.status === 'completed')
        return Promise.resolve(j.result); if (['failed', 'cancelled'].includes(j.status))
        return Promise.reject(new Error(j.error ?? j.status)); return new Promise((resolve, reject) => { const list = this.waiters.get(id) ?? []; this.waiters.set(id, [...list, resolve]); if (timeoutMs > 0)
        setTimeout(() => reject(new Error('runtime_wait_timeout')), timeoutMs); }); }
    resolve(id, v) { for (const f of this.waiters.get(id) ?? [])
        f(v); this.waiters.delete(id); }
    rejectWait(id, e) { for (const f of this.waiters.get(id) ?? [])
        void Promise.reject(e); this.waiters.delete(id); }
    get(id) { return this.jobs.get(id); }
    list() { return [...this.jobs.values()].sort((a, b) => b.createdAt - a.createdAt); }
    approvalsList() { return [...this.approvals.values()].sort((a, b) => b.createdAt - a.createdAt); }
    stats() { const counts = {}; for (const j of this.jobs.values())
        counts[j.status] = (counts[j.status] ?? 0) + 1; return { concurrency: this.concurrency, active: this.active, queued: this.queue.length, counts }; }
}

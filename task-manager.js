export class TaskManager {
    tasks = new Map();
    create(id) { const t = { id, status: 'queued' }; this.tasks.set(id, t); return t; }
    start(id) { const t = this.tasks.get(id); if (!t)
        throw new Error('task_not_found'); t.status = 'running'; t.startedAt = Date.now(); return t; }
    finish(id, result) { const t = this.tasks.get(id); if (!t)
        return; t.result = result; t.finishedAt = Date.now(); t.status = result.status === 'completed' ? 'completed' : result.errors.some(e => e === 'task_cancelled') ? 'cancelled' : 'failed'; }
    fail(id, error) { const t = this.tasks.get(id); if (!t)
        return; t.error = error; t.finishedAt = Date.now(); t.status = error === 'task_cancelled' ? 'cancelled' : 'failed'; }
    get(id) { return this.tasks.get(id); }
    list() { return [...this.tasks.values()].sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0)); }
}

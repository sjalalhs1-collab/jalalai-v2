export class ModelRouter {
    providers = new Map();
    stats = new Map();
    register(p) { this.providers.set(p.id, p); return this; }
    async inventory() { const out = []; for (const p of this.providers.values()) {
        let healthy = false, models = [];
        try {
            healthy = await p.health();
            models = await p.listModels();
        }
        catch { }
        out.push({ provider: p.id, healthy, models, stats: this.stats.get(p.id) ?? { ok: 0, fail: 0, latency: 0 } });
    } return out; }
    score(p, model, profile) { const s = this.stats.get(p.id) ?? { ok: 0, fail: 0, latency: 0 }; const reliability = s.ok + s.fail ? s.ok / (s.ok + s.fail) : 0.8; const latency = s.ok ? s.latency / s.ok : 500; let score = reliability * 70 + (100 - Math.min(latency, 1000)) / 10; if (profile === 'speed')
        score += 20 - Math.min(latency, 500) / 25; if (profile === 'quality' || profile === 'reasoning')
        score += 8; if (profile === 'cost')
        score += 5; if (profile === 'coding' && /code|coder|coding/i.test(model))
        score += 10; return { providerId: p.id, model, score, reason: `reliability=${reliability.toFixed(2)}, avgLatency=${Math.round(latency)}ms, profile=${profile}` }; }
    async candidates(profile) { const all = []; for (const p of this.providers.values()) {
        try {
            if (!(await p.health()))
                continue;
            for (const m of await p.listModels())
                all.push(this.score(p, m, profile));
        }
        catch { }
    } return all.sort((a, b) => b.score - a.score); }
    async route(profile) { const c = await this.candidates(profile); if (!c.length)
        throw new Error('No healthy model provider configured'); return c[0]; }
    record(p, ok, latency = 0) { const s = this.stats.get(p) ?? { ok: 0, fail: 0, latency: 0 }; if (ok) {
        s.ok++;
        s.latency = s.latency * (s.ok - 1) + latency;
    }
    else
        s.fail++; this.stats.set(p, s); }
    async generate(req, profile = 'quality') { const candidates = await this.candidates(profile); if (!candidates.length)
        throw new Error('No healthy model provider configured'); const errors = []; for (const r of candidates.slice(0, 4)) {
        const p = this.providers.get(r.providerId);
        const t = Date.now();
        try {
            const out = await p.generate({ ...req, model: req.model ?? r.model });
            this.record(p.id, true, out.latencyMs || Date.now() - t);
            return out;
        }
        catch (e) {
            this.record(p.id, false);
            errors.push(`${p.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
    } throw new Error(`All model providers failed. ${errors.join(' | ')}`); }
    async generateStream(req, profile = 'quality', onChunk) { const candidates = await this.candidates(profile); if (!candidates.length)
        throw new Error('No healthy model provider configured'); const errors = []; for (const r of candidates.slice(0, 4)) {
        const p = this.providers.get(r.providerId);
        const t = Date.now();
        try {
            let out;
            if (p.generateStream)
                out = await p.generateStream({ ...req, model: req.model ?? r.model }, onChunk);
            else {
                out = await p.generate({ ...req, model: req.model ?? r.model });
                onChunk({ type: 'text', text: out.text });
                onChunk({ type: 'done', response: out });
            }
            this.record(p.id, true, out.latencyMs || Date.now() - t);
            return out;
        }
        catch (e) {
            this.record(p.id, false);
            errors.push(`${p.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
    } throw new Error(`All streaming providers failed. ${errors.join(' | ')}`); }
}
export class LocalDemoProvider {
    id = 'local-demo';
    async health() { return true; }
    async listModels() { return ['jalalai-demo-1']; }
    async generate(r) { const start = Date.now(); const user = r.messages.find(m => m.role === 'user')?.content ?? ''; return { provider: this.id, model: r.model ?? 'jalalai-demo-1', text: `DEMO MODE — no external model API is configured.\n\nTask received:\n${user}\n\nConfigure OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY for real model execution.`, latencyMs: Date.now() - start }; }
}

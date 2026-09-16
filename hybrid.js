import { VectorIndex } from './vector.js';
function terms(s) { return new Set(s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter(x => x.length > 1)); }
function lexical(a, b) { const A = terms(a), B = terms(b); if (!A.size || !B.size)
    return 0; let hit = 0; for (const x of A)
    if (B.has(x))
        hit++; return hit / Math.sqrt(A.size * B.size); }
export class HybridIndex {
    vector = new VectorIndex();
    texts = new Map();
    async upsert(id, text, payload) { this.texts.set(id, text); await this.vector.upsert(id, text, payload); }
    async search(query, limit = 8) {
        const candidates = await this.vector.search(query, Math.max(limit * 4, 20));
        return candidates.map(c => { const l = lexical(query, this.texts.get(c.id) ?? c.text); return { score: .65 * c.score + .35 * l, vectorScore: c.score, lexicalScore: l, payload: c.payload }; }).sort((a, b) => b.score - a.score).slice(0, limit);
    }
    size() { return this.texts.size; }
}

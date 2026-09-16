export class HashEmbedding {
    dims;
    constructor(dims = 128) {
        this.dims = dims;
    }
    async embed(text) { const v = new Array(this.dims).fill(0); const words = text.toLowerCase().split(/\W+/).filter(Boolean); for (const w of words) {
        let h = 2166136261;
        for (let i = 0; i < w.length; i++) {
            h ^= w.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        ;
        v[Math.abs(h) % this.dims] += 1;
    } const n = Math.hypot(...v) || 1; return v.map(x => x / n); }
}
export function cosine(a, b) { let d = 0, na = 0, nb = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) {
    d += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
} return na && nb ? d / Math.sqrt(na * nb) : 0; }
export class VectorIndex {
    embeddings;
    items = [];
    constructor(embeddings = new HashEmbedding()) {
        this.embeddings = embeddings;
    }
    async upsert(id, text, payload) { const vector = await this.embeddings.embed(text); const old = this.items.findIndex(x => x.id === id); const item = { id, vector, text, payload }; if (old >= 0)
        this.items[old] = item;
    else
        this.items.push(item); }
    add(item) { this.items.push({ id: item.id, text: item.text, vector: item.vector, payload: item.payload }); return this; }
    search(query, limit = 5) { if (Array.isArray(query))
        return this.items.map(x => ({ item: x, score: cosine(query, x.vector) })).sort((a, b) => b.score - a.score).slice(0, limit); return this.searchAsync(query, limit); }
    async searchAsync(query, limit = 5) { const q = await this.embeddings.embed(query); return this.items.map(x => ({ ...x, score: cosine(q, x.vector) })).sort((a, b) => b.score - a.score).slice(0, limit); }
    size() { return this.items.length; }
}

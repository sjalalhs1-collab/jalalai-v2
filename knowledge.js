import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const parent = (p) => p.includes('/') ? p.slice(0, p.lastIndexOf('/')) || '.' : '.';
import { HybridIndex } from './hybrid.js';
function chunks(text, size = 1800, overlap = 250) { const clean = text.replace(/\u0000/g, ' ').replace(/\s+/g, ' ').trim(); const out = []; for (let i = 0; i < clean.length; i += Math.max(1, size - overlap))
    out.push(clean.slice(i, i + size)); return out.filter(Boolean); }
export class KnowledgeStore {
    filePath;
    docs = new Map();
    chunks = new Map();
    vector = new HybridIndex();
    constructor(filePath = './data/jalalai-knowledge.json') {
        this.filePath = filePath;
        this.load();
    }
    load() { try {
        if (!existsSync(this.filePath))
            return;
        const p = JSON.parse(readFileSync(this.filePath, 'utf8'));
        for (const d of p.documents ?? [])
            this.docs.set(d.id, d);
        for (const c of p.chunks ?? [])
            this.chunks.set(c.id, c);
        for (const c of this.chunks.values())
            void this.vector.upsert(c.id, c.text, c);
    }
    catch { } }
    save() { try {
        mkdirSync(parent(this.filePath), { recursive: true });
        writeFileSync(this.filePath, JSON.stringify({ documents: this.listDocuments(), chunks: [...this.chunks.values()] }, null, 2));
    }
    catch { } }
    async upsertDocument(input) { const id = input.id ?? `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; const now = Date.now(); const doc = { id, name: input.name, source: input.source, mimeType: input.mimeType, createdAt: this.docs.get(id)?.createdAt ?? now, updatedAt: now, metadata: input.metadata }; this.docs.set(id, doc); for (const key of [...this.chunks.keys()])
        if (this.chunks.get(key)?.documentId === id)
            this.chunks.delete(key); const parts = chunks(input.text); for (let i = 0; i < parts.length; i++) {
        const c = { id: `${id}:${i}`, documentId: id, source: input.source, name: input.name, text: parts[i], index: i, createdAt: now };
        this.chunks.set(c.id, c);
        await this.vector.upsert(c.id, c.text, c);
    } this.save(); return { document: doc, chunks: parts.length }; }
    async search(query, limit = 8) { return (await this.vector.search(query, limit)).map(x => ({ score: x.score, vectorScore: x.vectorScore, lexicalScore: x.lexicalScore, ...x.payload })); }
    listDocuments() { return [...this.docs.values()].sort((a, b) => b.updatedAt - a.updatedAt); }
    get(id) { return this.docs.get(id); }
    stats() { return { documents: this.docs.size, chunks: this.chunks.size }; }
}

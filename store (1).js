import { readFileSync, writeFileSync, existsSync } from 'node:fs';
export class InMemoryStore {
    items = [];
    put(r) { this.items.push(r); return r; }
    search(q, limit = 5) { const terms = q.toLowerCase().split(/\W+/).filter(Boolean); return this.items.map(x => ({ x, score: terms.filter(t => (x.content + ' ' + x.tags.join(' ')).toLowerCase().includes(t)).length })).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(x => x.x); }
    all() { return [...this.items]; }
}
export class JsonFileStore extends InMemoryStore {
    filePath;
    constructor(filePath = './data/jalalai-memory.json') {
        super();
        this.filePath = filePath;
        this.load();
    }
    load() { try {
        if (existsSync(this.filePath)) {
            const rows = JSON.parse(readFileSync(this.filePath, 'utf8'));
            for (const r of rows)
                super.put(r);
        }
    }
    catch { } }
    put(r) { const out = super.put(r); try {
        writeFileSync(this.filePath, JSON.stringify(this.all(), null, 2));
    }
    catch { } return out; }
}

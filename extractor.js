export class EvidenceExtractor {
    extract(page, query, max = 5) {
        const terms = [...new Set(query.toLowerCase().split(/\W+/).filter(t => t.length > 2))];
        const sentences = page.text.split(/(?<=[.!?])\s+/).filter(Boolean);
        return sentences.map((s, i) => { const low = s.toLowerCase(); const hits = terms.filter(t => low.includes(t)).length; return { s, i, hits }; }).filter(x => x.hits > 0).sort((a, b) => b.hits - a.hits).slice(0, max).map(x => ({ source: page.url, claim: query, confidence: Math.min(1, .45 + x.hits / Math.max(terms.length, 1) * .5), retrievedAt: page.retrievedAt, quote: x.s.slice(0, 500), title: page.title }));
    }
}

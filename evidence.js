const official = /(^|\.)(gov|gov\.uk|gov\.pk|edu|ac\.uk)(\.|$)/i;
const qualityDomains = /^(who\.int|un\.org|oecd\.org|worldbank\.org|imf\.org|nih\.gov|nature\.com|science\.org)$/i;
export class EvidenceEngine {
    rank(hits, query) {
        const terms = [...new Set(query.toLowerCase().split(/\W+/).filter(t => t.length > 2))];
        return hits.map((h, i) => {
            const hay = (h.title + ' ' + h.snippet + ' ' + h.source).toLowerCase();
            const relevance = terms.length ? terms.filter(t => hay.includes(t)).length / terms.length : 0;
            const host = h.source.toLowerCase().replace(/^www\./, '');
            const authority = qualityDomains.test(host) ? 1 : official.test(host) ? 0.9 : /\.(org|int)$/i.test(host) ? 0.65 : 0.45;
            const freshnessPenalty = 0;
            const rankBonus = Math.max(0, 1 - i * .06);
            const score = Math.min(1, .50 * relevance + .40 * authority + .10 * rankBonus - freshnessPenalty);
            return { ...h, score, authority, relevance };
        }).sort((a, b) => b.score - a.score);
    }
    fromSearch(hits, claim) { return this.rank(hits, claim).slice(0, 8).map(h => ({ source: h.url, claim, confidence: h.score, retrievedAt: Date.now() })); }
}

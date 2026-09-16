function decodeHtml(s) { return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&#x27;/gi, "'").replace(/\s+/g, ' ').trim(); }
export class WebSearch {
    async search(query, limit = 8) {
        if (!query.trim())
            return [];
        const u = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const res = await fetch(u, { headers: { 'user-agent': 'JalalAI/0.7 research' } });
        if (!res.ok)
            throw new Error(`Web search failed: ${res.status}`);
        const html = await res.text();
        const hits = [];
        const blockRe = /<div[^>]+class="result"[\s\S]*?<\/div>\s*<\/div>/gi;
        for (const block of html.matchAll(blockRe)) {
            const b = block[0];
            const a = b.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
            if (!a)
                continue;
            let url = a[1];
            try {
                if (url.startsWith('//'))
                    url = 'https:' + url;
                const parsed = new URL(url);
                if (parsed.hostname.includes('duckduckgo.com') && parsed.searchParams.has('uddg'))
                    url = decodeURIComponent(parsed.searchParams.get('uddg'));
            }
            catch {
                continue;
            }
            if (!/^https?:\/\//i.test(url))
                continue;
            const snippet = decodeHtml((b.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? b.match(/<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? ''));
            const title = decodeHtml(a[2]);
            try {
                hits.push({ title, url, snippet, source: new URL(url).hostname, rank: hits.length + 1 });
            }
            catch { }
            if (hits.length >= Math.min(limit, 10))
                break;
        }
        // Fallback parser for pages whose result wrappers differ.
        if (!hits.length) {
            const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
            let m;
            while ((m = re.exec(html)) && hits.length < Math.min(limit, 10)) {
                try {
                    let url = m[1];
                    if (url.startsWith('//'))
                        url = 'https:' + url;
                    const p = new URL(url);
                    if (p.searchParams.has('uddg'))
                        url = decodeURIComponent(p.searchParams.get('uddg'));
                    if (!/^https?:\/\//.test(url))
                        continue;
                    hits.push({ title: decodeHtml(m[2]), url, snippet: '', source: new URL(url).hostname, rank: hits.length + 1 });
                }
                catch { }
            }
        }
        return hits;
    }
}

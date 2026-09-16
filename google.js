export class GoogleProvider {
    apiKey;
    defaultModel;
    id = 'google';
    constructor(apiKey = process.env.GEMINI_API_KEY ?? '', defaultModel = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash') {
        this.apiKey = apiKey;
        this.defaultModel = defaultModel;
    }
    async health() { return Boolean(this.apiKey); }
    async listModels() { return [this.defaultModel]; }
    body(r) { const contents = r.messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })); const system = r.messages.filter(m => m.role === 'system').map(m => m.content).join('\n'); const b = { contents, generationConfig: { temperature: r.temperature, maxOutputTokens: r.maxTokens } }; if (system)
        b.systemInstruction = { parts: [{ text: system }] }; return b; }
    async generate(r) { if (!this.apiKey)
        throw new Error('GEMINI_API_KEY is not configured'); const t = Date.now(); const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(r.model ?? this.defaultModel)}:generateContent?key=${encodeURIComponent(this.apiKey)}`; const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(this.body(r)), signal: r.signal }); const data = await res.json(); if (!res.ok)
        throw new Error(`Google ${res.status}: ${data?.error?.message ?? 'request failed'}`); const text = (data.candidates ?? []).flatMap((c) => c.content?.parts ?? []).map((p) => p.text ?? '').join(''); return { provider: this.id, model: r.model ?? this.defaultModel, text, latencyMs: Date.now() - t, inputTokens: data.usageMetadata?.promptTokenCount, outputTokens: data.usageMetadata?.candidatesTokenCount, raw: data }; }
    async generateStream(r, onChunk) { if (!this.apiKey)
        throw new Error('GEMINI_API_KEY is not configured'); const t = Date.now(); const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(r.model ?? this.defaultModel)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(this.apiKey)}`; const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(this.body(r)), signal: r.signal }); if (!res.ok) {
        const data = await res.json();
        throw new Error(`Google ${res.status}: ${data?.error?.message ?? 'stream request failed'}`);
    } if (!res.body)
        throw new Error('Google streaming body unavailable'); const reader = res.body.getReader(), decoder = new TextDecoder(); let buffer = '', text = '', inputTokens = 0, outputTokens = 0; while (true) {
        const { value, done } = await reader.read();
        if (done)
            break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            if (!line.startsWith('data:'))
                continue;
            let d;
            try {
                d = JSON.parse(line.slice(5).trim());
            }
            catch {
                continue;
            }
            const delta = (d.candidates ?? []).flatMap((c) => c.content?.parts ?? []).map((p) => p.text ?? '').join('');
            if (delta) {
                text += delta;
                onChunk({ type: 'text', text: delta });
            }
            inputTokens += d.usageMetadata?.promptTokenCount ?? 0;
            outputTokens += d.usageMetadata?.candidatesTokenCount ?? 0;
        }
    } const out = { provider: this.id, model: r.model ?? this.defaultModel, text, latencyMs: Date.now() - t, inputTokens: inputTokens || undefined, outputTokens: outputTokens || undefined }; onChunk({ type: 'done', response: out }); return out; }
}

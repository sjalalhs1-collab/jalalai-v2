function parseCSV(s) { const lines = s.trim().split(/\r?\n/).filter(Boolean); if (!lines.length)
    return { h: [], r: [] }; const parse = (x) => x.split(',').map(v => v.trim().replace(/^"|"$/g, '')); return { h: parse(lines[0]), r: lines.slice(1).map(parse) }; }
export function analyzeCSV(csv) { const { h, r } = parseCSV(csv); const numeric = {}; const missing = {}; h.forEach((k, i) => { const vals = r.map(x => x[i] ?? '').filter(Boolean); missing[k] = r.length - vals.length; const nums = vals.map(Number).filter(Number.isFinite); if (nums.length) {
    const sum = nums.reduce((a, b) => a + b, 0);
    numeric[k] = { count: nums.length, sum, mean: sum / nums.length, min: Math.min(...nums), max: Math.max(...nums) };
} }); return { rows: r.length, columns: h, numeric, missing, summary: `${r.length} rows × ${h.length} columns; numeric fields: ${Object.keys(numeric).length}; missing cells: ${Object.values(missing).reduce((a, b) => a + b, 0)}` }; }

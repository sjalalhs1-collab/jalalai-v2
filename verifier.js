export class Verifier {
    verify(answer, evidence, mode) { const issues = []; if (!answer.trim())
        issues.push('Empty answer'); if (mode === 'verified' && evidence.length === 0)
        issues.push('Verified mode requires evidence'); if (evidence.some(e => e.confidence < 0.5))
        issues.push('Low-confidence evidence present'); let score = answer.trim() ? 0.7 : 0; score += Math.min(0.3, evidence.length * 0.1); if (mode === 'verified' && evidence.length)
        score = Math.min(1, score + 0.05); return { pass: issues.length === 0 && score >= 0.7, score, issues, evidence }; }
    merge(outputs) { return { answer: outputs.map(o => `[${o.expert}]\n${o.text}`).join('\n\n'), evidence: outputs.flatMap(o => o.evidence) }; }
}

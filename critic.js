export class CriticAgent {
    review(answer, evidence, mode) {
        const issues = [];
        const missingEvidence = [];
        const suggestions = [];
        if (!answer.trim())
            issues.push('Answer is empty');
        if (/\b(I think|maybe|probably|not sure)\b/i.test(answer)) {
            issues.push('Answer contains uncertainty language');
            suggestions.push('State uncertainty explicitly and identify what would verify it.');
        }
        if (mode !== 'fast' && evidence.length === 0)
            missingEvidence.push('No evidence attached for a non-fast task');
        if (mode === 'verified' && evidence.length < 2)
            missingEvidence.push('Verified mode benefits from at least two independent evidence items');
        const score = Math.max(0, Math.min(1, 0.8 - (issues.length * .1) - (missingEvidence.length * .12) + (evidence.length ? 0.1 : 0)));
        return { pass: issues.length === 0 && missingEvidence.length === 0, score, issues, missingEvidence, suggestions };
    }
}

import { CriticAgent } from '../critique/critic.js';
export class SelfCorrectionLoop {
    router;
    critic;
    constructor(router, critic = new CriticAgent()) {
        this.router = router;
        this.critic = critic;
    }
    async improve(req, answer, evidence) {
        let current = answer, ev = evidence, iterations = 0, report = this.critic.review(current, ev, req.mode);
        while (!report.pass && iterations < 2) {
            iterations++;
            const prompt = `Review and improve this answer. Do not invent facts or sources.\nIssues: ${report.issues.join('; ')}\nMissing evidence: ${report.missingEvidence.join('; ')}\nOriginal task: ${req.input}\nAnswer:\n${current}`;
            try {
                const out = await this.router.generate({ messages: [{ role: 'system', content: 'You are JalalAI self-correction editor. Preserve correct content, fix errors, clearly mark uncertainty.' }, { role: 'user', content: prompt }] }, 'quality');
                current = out.text || current;
                report = this.critic.review(current, ev, req.mode);
            }
            catch {
                break;
            }
        }
        return { answer: current, evidence: ev, iterations, score: report.score, issues: [...report.issues, ...report.missingEvidence] };
    }
}

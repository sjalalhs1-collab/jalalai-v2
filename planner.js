export class Planner {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    plan(task) { const domains = this.registry.detect(task.input); const experts = this.registry.select(domains, Math.min(4, Math.max(1, domains.length))); const steps = experts.length ? experts.map((e, i) => ({ id: `step-${i + 1}`, goal: `Analyze and solve the ${e.domains.join(', ')} aspects of the task`, expert: e.id, tools: [...e.requiredTools], dependsOn: i ? ['step-1'] : [], verification: e.verification })) : [{ id: 'step-1', goal: 'Analyze and solve the task', expert: 'expert.general-knowledge', tools: [], dependsOn: [], verification: ['critic.review'] }]; const all = steps[0]; const lower = task.input.toLowerCase(); if (/https?:\/\//i.test(task.input) && !all.tools.includes('browser.open'))
        all.tools.push('browser.open'); if (/\b(run|execute|evaluate)\s+(this\s+)?(javascript|js|code)\b/i.test(task.input) && !all.tools.includes('code.sandbox'))
        all.tools.push('code.sandbox'); if (/^[\s\d()+\-*/%.]+$/.test(task.input.trim()) && !all.tools.includes('calculator'))
        all.tools.push('calculator'); return { taskId: task.id, steps, rationale: `Detected domains: ${domains.join(', ') || 'general-knowledge'}` }; }
}

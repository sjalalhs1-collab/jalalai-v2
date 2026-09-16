export class AgentDelegator {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    plan(req) {
        const domains = req.domains?.length ? req.domains : this.registry.detect(req.input);
        const agents = this.registry.select(domains, Math.min(8, Math.max(1, req.maxAgents ?? 4)));
        if (!agents.length) {
            const fallback = this.registry.get('expert.general-knowledge');
            return fallback ? [{ agent: fallback, reason: 'fallback generalist' }] : [];
        }
        return agents.map((agent, i) => ({ agent, reason: i === 0 ? 'primary domain specialist' : 'independent cross-check specialist' }));
    }
}

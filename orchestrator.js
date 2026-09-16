import { AgentRegistry } from '../agents/registry.js';
import { Planner } from './planner.js';
import { ModelRouter } from '../models/router.js';
import { Verifier } from '../verification/verifier.js';
import { CriticAgent } from '../critique/critic.js';
import { SelfCorrectionLoop } from '../self-correction/loop.js';
import { WebSearch } from '../research/web-search.js';
import { EvidenceEngine } from '../research/evidence.js';
import { EvidenceExtractor } from '../research/extractor.js';
import { VectorIndex } from '../rag/vector.js';
import { JsonFileStore } from '../memory/store.js';
import { BrowserResearch } from '../research/browser.js';
import { DebateEngine } from '../critique/debate.js';
import { EventBus } from '../streaming/events.js';
import { createBuiltinTools } from '../tools/builtins.js';
import { executeRequestedTool } from '../autonomy/agent-tools.js';
import { DEFAULT_PERMISSIONS } from '../security/permissions.js';
import { KnowledgeStore } from '../rag/knowledge.js';
import { AgentDelegator } from '../agents/delegation.js';
const id = () => globalThis.crypto?.randomUUID?.() ?? `trace-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export class MasterOrchestrator {
    registry;
    router;
    verifier;
    planner;
    critic;
    correction;
    search;
    evidence;
    memory;
    browser;
    debate;
    events = new EventBus();
    extractor = new EvidenceExtractor();
    vector = new VectorIndex();
    tools = createBuiltinTools();
    knowledge;
    delegator;
    constructor(registry = new AgentRegistry(), router = new ModelRouter(), verifier = new Verifier(), memory = new JsonFileStore(process.env.JALALAI_MEMORY_PATH ?? './data/jalalai-memory.json')) {
        this.registry = registry;
        this.router = router;
        this.verifier = verifier;
        this.planner = new Planner(registry);
        this.critic = new CriticAgent();
        this.correction = new SelfCorrectionLoop(router, this.critic);
        this.search = new WebSearch();
        this.evidence = new EvidenceEngine();
        this.memory = memory;
        this.browser = new BrowserResearch();
        this.debate = new DebateEngine();
        this.knowledge = new KnowledgeStore(process.env.JALALAI_KNOWLEDGE_PATH ?? './data/jalalai-knowledge.json');
        this.delegator = new AgentDelegator(this.registry);
    }
    async run(req, signal) {
        const traceId = id();
        this.events.emit({ taskId: req.id, type: 'status', data: 'planning' });
        try {
            if (signal?.aborted)
                throw new Error('task_cancelled');
            const permissions = { ...DEFAULT_PERMISSIONS, ...req.permissions };
            if (req.attachments?.length && permissions.files === false)
                throw new Error('File permission denied for attachments');
            if (req.attachments?.length) {
                this.events.emit({ taskId: req.id, type: 'files', data: req.attachments.map(a => ({ id: a.id, name: a.name, size: a.size, type: a.type })) });
            }
            const plan = this.planner.plan(req);
            this.events.emit({ taskId: req.id, type: 'plan', data: plan });
            const outputs = [];
            const toolNames = new Set(plan.steps.flatMap(s => s.tools));
            const toolResults = [];
            for (const name of toolNames) {
                if (name === 'web.search')
                    continue;
                try {
                    const input = name === 'calculator' ? req.input : name === 'browser.open' ? ((req.input.match(/https?:\/\/[^\s]+/i)?.[0]) ?? req.input) : name === 'time.now' ? '' : req.input;
                    const value = await executeRequestedTool(name, input, permissions, this.tools, req.id);
                    toolResults.push({ tool: name, result: value });
                    this.events.emit({ taskId: req.id, type: 'tool', data: { tool: name, ok: true, result: value } });
                }
                catch (e) {
                    this.events.emit({ taskId: req.id, type: 'tool', data: { tool: name, ok: false, error: e instanceof Error ? e.message : String(e) } });
                }
            }
            if (req.attachments?.length) {
                for (const a of req.attachments) {
                    await this.knowledge.upsertDocument({ id: `attachment:${a.id}`, name: a.name, source: `attachment://${a.id}`, text: a.text, mimeType: a.type, metadata: { taskId: req.id } });
                }
            }
            let sharedEvidence = [];
            const needsResearch = req.mode !== 'fast' || plan.steps.some(s => s.tools.includes('web.search'));
            if (needsResearch) {
                if (permissions.web === false)
                    throw new Error('Web permission denied for research task');
                try {
                    const hits = await this.search.search(req.input, 8);
                    sharedEvidence = this.evidence.fromSearch(hits, req.input);
                    for (const ev of sharedEvidence.slice(0, 4)) {
                        try {
                            const page = await this.browser.open(ev.source, 18000);
                            const extracted = this.extractor.extract(page, req.input, 3);
                            for (const x of extracted) {
                                const e = { source: x.source, claim: x.claim, confidence: x.confidence, retrievedAt: x.retrievedAt };
                                sharedEvidence.push(e);
                                await this.vector.upsert(`${traceId}-${sharedEvidence.length}`, x.quote, e);
                            }
                        }
                        catch { }
                    }
                    sharedEvidence = sharedEvidence.sort((a, b) => b.confidence - a.confidence).slice(0, 12);
                    this.events.emit({ taskId: req.id, type: 'evidence', data: sharedEvidence });
                }
                catch (e) {
                    if (req.mode === 'verified')
                        throw new Error(`Research unavailable: ${e instanceof Error ? e.message : String(e)}`);
                }
            }
            const profile = req.mode === 'fast' ? 'speed' : req.mode === 'deep' ? 'reasoning' : 'quality';
            const execute = async (step) => { if (signal?.aborted)
                throw new Error('task_cancelled'); const memory = this.memory.search(`${req.input} ${step.expert}`, 3); const semantic = await this.vector.search(req.input, 3); const knowledge = await this.knowledge.search(req.input, 6); let response = await this.router.generateStream({ signal, messages: [{ role: 'system', content: `You are ${step.expert}. Give rigorous expert analysis. Do not invent facts or sources. Reconcile evidence and memory carefully.` }, { role: 'user', content: `Task: ${req.input}\nGoal: ${step.goal}\nAttached files:\n${(req.attachments ?? []).map(a => `### ${a.name}\n${a.text.slice(0, 50000)}`).join('\n')}\nEvidence:\n${sharedEvidence.map(e => e.source + ' — ' + e.claim).join('\n')}\nRelevant memory:\n${memory.map(m => m.content).join('\n')}\nSemantic evidence:\n${semantic.map(m => m.payload.source + ' — ' + m.payload.claim).join('\n')}\nKnowledge Vault:\n${knowledge.map(k => k.source + ' — ' + k.text).join('\n')}\nTool results:\n${toolResults.map(t => t.tool + ' — ' + JSON.stringify(t.result)).join('\n')}` }] }, profile, c => { if (c.type === 'text' && c.text)
                this.events.emit({ taskId: req.id, type: 'token', data: { expert: step.expert, text: c.text } }); }); const out = { expert: step.expert, text: response.text, confidence: .75, evidence: sharedEvidence }; this.events.emit({ taskId: req.id, type: 'expert', data: out }); return out; };
            const limit = 4;
            for (let i = 0; i < plan.steps.length; i += limit) {
                const batch = plan.steps.slice(i, i + limit);
                outputs.push(...await Promise.all(batch.map(execute)));
                if (signal?.aborted)
                    throw new Error('task_cancelled');
            }
            const debate = this.debate.review(outputs);
            let merged = this.verifier.merge(outputs);
            if (outputs.length > 1 && debate.disagreements.length) {
                merged = { answer: `${merged.answer}\n\n[Consensus review]\n${debate.disagreements.join(' ')}`, evidence: merged.evidence };
            }
            let correction = await this.correction.improve(req, merged.answer, merged.evidence);
            this.events.emit({ taskId: req.id, type: 'critique', data: { score: correction.score, iterations: correction.iterations, issues: correction.issues } });
            const report = this.verifier.verify(correction.answer, correction.evidence, req.mode);
            const critique = this.critic.review(correction.answer, correction.evidence, req.mode);
            if (!critique.pass && req.mode === 'verified') {
                const result = { taskId: req.id, status: 'failed', answer: correction.answer, confidence: Math.min(report.score, critique.score), evidence: correction.evidence, errors: [...report.issues, ...critique.issues, ...critique.missingEvidence], traceId, plan, steps: outputs };
                this.events.emit({ taskId: req.id, type: 'error', data: result.errors });
                return result;
            }
            if (!/DEMO MODE/.test(correction.answer)) {
                this.memory.put({ id: traceId, taskId: req.id, content: correction.answer, tags: plan.steps.map(s => s.expert), createdAt: Date.now(), evidence: correction.evidence });
            }
            const result = { taskId: req.id, status: (report.pass ? 'completed' : 'failed'), answer: correction.answer, confidence: Math.min(report.score, critique.score), evidence: correction.evidence, errors: [...report.issues, ...critique.issues], traceId, plan, steps: outputs };
            this.events.emit({ taskId: req.id, type: 'final', data: result });
            return result;
        }
        catch (e) {
            const result = { taskId: req.id, status: 'failed', confidence: 0, evidence: [], errors: [e instanceof Error ? e.message : String(e)], traceId };
            this.events.emit({ taskId: req.id, type: 'error', data: result.errors });
            return result;
        }
    }
}

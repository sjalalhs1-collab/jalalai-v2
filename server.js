import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MasterOrchestrator } from '../core/orchestrator.js';
import { ModelRouter, LocalDemoProvider } from '../models/router.js';
import { OpenAIProvider } from '../providers/openai.js';
import { AnthropicProvider } from '../providers/anthropic.js';
import { GoogleProvider } from '../providers/google.js';
import { RateLimiter } from '../auth/rate-limit.js';
import { DEFAULT_PERMISSIONS } from '../security/permissions.js';
import { createBuiltinTools } from '../tools/builtins.js';
import { TaskManager } from '../autonomy/task-manager.js';
import { WorkflowManager } from '../autonomy/workflow-manager.js';
import { ProductionRuntime } from '../autonomy/production-runtime.js';
import { createProductionTools } from '../tools/production.js';
import { constantTimeTokenEqual } from '../security/production.js';
import { securityConfig } from '../security/config.js';
import { createArtifact } from '../artifacts/artifact-engine.js';
import { analyzeCSV } from '../analysis/data-analysis.js';
import { CREATIVE_CAPABILITIES } from '../creative/capabilities.js';
import { normalizeCreativePrompt } from '../creative/prompt-router.js';
import { IdentityService } from '../identity/service.js';
import { verifyJazzCashHash, verifyGenericHmacSignature, buildJazzCashCheckoutFields } from '../billing/gateways.js';
const identity = new IdentityService().load();
const router = new ModelRouter().register(new OpenAIProvider()).register(new AnthropicProvider()).register(new GoogleProvider()).register(new LocalDemoProvider());
const orchestrator = new MasterOrchestrator(undefined, router);
const sec = securityConfig();
const limiter = new RateLimiter(sec.rateLimit || 1_000_000_000);
const token = process.env.JALALAI_API_TOKEN ?? '';
if (sec.requireAuth && !token)
    console.warn('JalalAI security: JALALAI_API_TOKEN is not set; API requests will be rejected until configured.');
const MAX_BODY = sec.maxBodyBytes;
const MAX_FILE_TEXT = 250_000;
const MAX_FILES = 8;
const activeTasks = new Map();
const taskManager = new TaskManager();
const workflowManager = new WorkflowManager();
await workflowManager.load();
await workflowManager.recover();
const builtinTools = createBuiltinTools();
const productionTools = createProductionTools();
const runtime = new ProductionRuntime(async (job, signal) => { const c = activeTasks.get(job.id); if (c)
    return orchestrator.run({ id: job.id, input: job.input, mode: job.mode ?? 'fast', language: job.language, context: job.context, attachments: job.attachments ?? [], permissions: job.permissions ?? DEFAULT_PERMISSIONS }, signal); throw new Error('runtime_handler_context_missing'); });
await runtime.load();
const ALLOWED_TEXT_TYPES = new Set(['', 'text/plain', 'text/markdown', 'text/csv', 'application/json', 'application/xml', 'text/xml', 'text/html', 'application/javascript', 'text/javascript']);
function authorized(req) { if (!sec.requireAuth)
    return true; if (!token)
    return false; const value = String(req.headers.authorization ?? ''); return value.startsWith('Bearer ') && constantTimeTokenEqual(value.slice(7), token); }
function headers(res, type = 'application/json') { res.setHeader('access-control-allow-origin', sec.corsOrigin); res.setHeader('access-control-allow-methods', 'POST,GET,DELETE,OPTIONS'); res.setHeader('access-control-allow-headers', 'content-type,authorization,x-client-id'); res.setHeader('x-content-type-options', 'nosniff'); res.setHeader('referrer-policy', 'no-referrer'); res.setHeader('x-frame-options', 'DENY'); res.setHeader('content-security-policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'"); res.setHeader('permissions-policy', 'camera=(),microphone=(),geolocation=()'); res.setHeader('content-type', type); }
async function body(req) { let out = ''; for await (const c of req) {
    out += c;
    if (out.length > MAX_BODY)
        throw new Error('request_too_large');
} return out; }
const server = createServer(async (req, res) => {
    try {
        if (req.method === 'OPTIONS') {
            headers(res);
            res.statusCode = 204;
            return res.end();
        }
        if (req.url === '/' || req.url === '/app' || req.url === '/index.html') {
            const html = await readFile(join(process.cwd(), 'public/index.html'), 'utf8');
            headers(res, 'text/html; charset=utf-8');
            return res.end(html);
        }
        if (req.url === '/app.js') {
            const js = await readFile(join(process.cwd(), 'public/app.js'), 'utf8');
            headers(res, 'text/javascript; charset=utf-8');
            return res.end(js);
        }
        if (req.url === '/app.css') {
            const css = await readFile(join(process.cwd(), 'public/app.css'), 'utf8');
            headers(res, 'text/css; charset=utf-8');
            return res.end(css);
        }
        if (req.url === '/pricing') {
            const html = await readFile(join(process.cwd(), 'public/pricing.html'), 'utf8');
            headers(res, 'text/html; charset=utf-8');
            return res.end(html);
        }
        if (req.url === '/home.html') {
            const html = await readFile(join(process.cwd(), 'public/home.html'), 'utf8');
            headers(res, 'text/html; charset=utf-8');
            return res.end(html);
        }
        if (req.url === '/account.html') {
            const html = await readFile(join(process.cwd(), 'public/account.html'), 'utf8');
            headers(res, 'text/html; charset=utf-8');
            return res.end(html);
        }
        if (req.url === '/manifest.webmanifest') {
            const m = await readFile(join(process.cwd(), 'public/manifest.webmanifest'), 'utf8');
            headers(res, 'application/manifest+json; charset=utf-8');
            return res.end(m);
        }
        if (req.url === '/robots.txt') {
            const t = await readFile(join(process.cwd(), 'public/robots.txt'), 'utf8');
            headers(res, 'text/plain; charset=utf-8');
            return res.end(t);
        }
        if (req.url === '/sitemap.xml') {
            const t = await readFile(join(process.cwd(), 'public/sitemap.xml'), 'utf8');
            headers(res, 'application/xml; charset=utf-8');
            return res.end(t);
        }
        if (req.url?.startsWith('/assets/')) {
            const name = req.url.slice('/assets/'.length);
            const extMatch = /^[a-zA-Z0-9._-]+\.(png|jpg|jpeg|svg|webp)$/.exec(name);
            if (!extMatch) {
                res.statusCode = 404;
                return res.end('not_found');
            }
            const ext = extMatch[1];
            const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
            const file = await readFile(join(process.cwd(), 'public/assets', name));
            headers(res, mime);
            return res.end(file);
        }
        if (req.url === '/health') {
            headers(res);
            return res.end(JSON.stringify({ ok: true, version: '1.9.17', capabilities: ['command-center', 'research', 'rag', 'debate', 'verification', 'task-scoped-events', 'live-token-streaming', 'parallel-experts', 'task-cancellation', 'file-intelligence', 'model-inventory', 'autonomous-tools', 'browser-fetch', 'code-sandbox', 'task-manager', 'persistent-knowledge-vault', 'document-chunking', 'knowledge-search', 'tool-result-grounding', 'durable-workflows', 'workflow-recovery', 'bounded-workflow-retries', 'production-runtime', 'durable-job-queue', 'worker-concurrency', 'runtime-recovery', 'human-approval-gates', 'optional-browser-automation', 'production-security', 'configurable-rate-limit', 'public-url-ssrf-guard', 'unlimited-application-usage', 'multimodal-creative', 'office-artifacts', 'word-docx', 'excel-xlsx', 'powerpoint-pptx', 'pdf-export', 'svg-vector-art', 'data-analysis', 'web-design', 'app-design', 'image-generation-adapter', 'video-generation-adapter', 'user-identity-and-sessions', 'server-side-entitlement-enforcement'] }));
        }
        function bearerToken(req) { const value = String(req.headers.authorization ?? ''); return value.startsWith('Bearer ') ? value.slice(7) : ''; }
        function resolveUser(req) { return identity.resolveSession(bearerToken(req)); }
        if (req.method === 'POST' && req.url === '/v1/auth/register') {
            headers(res);
            const x = JSON.parse(await body(req));
            if (typeof x.email !== 'string' || typeof x.password !== 'string') {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'email_and_password_required' }));
            }
            const result = identity.register(x.email, x.password);
            if (!result.ok) {
                res.statusCode = result.reason === 'email_taken' ? 409 : 400;
                return res.end(JSON.stringify({ error: result.reason }));
            }
            res.statusCode = 201;
            return res.end(JSON.stringify({ userId: result.userId, token: result.token, plan: result.plan }));
        }
        if (req.method === 'POST' && req.url === '/v1/auth/login') {
            headers(res);
            const x = JSON.parse(await body(req));
            if (typeof x.email !== 'string' || typeof x.password !== 'string') {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'email_and_password_required' }));
            }
            const result = identity.login(x.email, x.password);
            if (!result.ok) {
                res.statusCode = result.reason === 'account_suspended' ? 403 : 401;
                return res.end(JSON.stringify({ error: result.reason }));
            }
            return res.end(JSON.stringify({ userId: result.userId, token: result.token, plan: result.plan }));
        }
        if (req.method === 'POST' && req.url === '/v1/auth/logout') {
            headers(res);
            const t = bearerToken(req);
            if (t)
                identity.logout(t);
            return res.end(JSON.stringify({ ok: true }));
        }
        if (req.method === 'GET' && req.url === '/v1/me') {
            headers(res);
            const u = resolveUser(req);
            if (!u) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            return res.end(JSON.stringify({ userId: u.userId, role: u.role, entitlement: identity.getEntitlementSnapshot(u.userId) }));
        }
        if (req.method === 'POST' && req.url === '/v1/admin/entitlements/grant') {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            const x = JSON.parse(await body(req));
            if (typeof x.userId !== 'string' || !['free', 'pro', 'ultra'].includes(x.planId)) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'userId_and_planId_required' }));
            }
            const plan = identity.grantPlan('operator-token', x.userId, x.planId, { platform: typeof x.platform === 'string' ? x.platform : null, renewsAt: typeof x.renewsAt === 'string' ? x.renewsAt : null, expiresAt: typeof x.expiresAt === 'string' ? x.expiresAt : null });
            return res.end(JSON.stringify({ plan }));
        }
        if (req.method === 'GET' && req.url?.startsWith('/v1/billing/jazzcash/checkout')) {
            headers(res);
            res.setHeader('content-type', 'text/html; charset=utf-8');
            const urlObj = new URL(req.url, 'http://localhost');
            const orderRef = urlObj.searchParams.get('orderRef') ?? '';
            const order = identity.getOrder(orderRef);
            const merchantId = process.env.JALALAI_JAZZCASH_MERCHANT_ID;
            const password = process.env.JALALAI_JAZZCASH_PASSWORD;
            const salt = process.env.JALALAI_JAZZCASH_INTEGRITY_SALT;
            const returnUrl = process.env.JALALAI_JAZZCASH_RETURN_URL;
            const checkoutUrl = process.env.JALALAI_JAZZCASH_CHECKOUT_URL ?? 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform';
            if (!order || order.status !== 'pending') {
                res.statusCode = 404;
                return res.end('<p>This order is no longer valid. Please start the upgrade again.</p>');
            }
            if (!merchantId || !password || !salt || !returnUrl) {
                res.statusCode = 503;
                return res.end('<p>JazzCash is not configured on this server yet (missing merchant credentials).</p>');
            }
            const fields = buildJazzCashCheckoutFields(order, { merchantId, password, integritySalt: salt, returnUrl });
            const inputs = Object.entries(fields).map(([k, v]) => `<input type="hidden" name="${k}" value="${String(v).replace(/"/g, '&quot;')}">`).join('');
            return res.end(`<!doctype html><html><body onload="document.forms[0].submit()"><p>Redirecting to JazzCash…</p><form method="POST" action="${checkoutUrl}">${inputs}</form></body></html>`);
        }
        if (req.method === 'POST' && req.url === '/v1/billing/create-order') {
            headers(res);
            const orderUser = resolveUser(req);
            if (!orderUser) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            const x = JSON.parse(await body(req));
            const gateway = typeof x.gateway === 'string' ? x.gateway : 'jazzcash';
            if (!['pro', 'ultra'].includes(x.planId) || !['jazzcash', 'easypaisa'].includes(gateway)) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'planId_and_gateway_required' }));
            }
            try {
                const order = identity.createOrder(orderUser.userId, x.planId, gateway);
                return res.end(JSON.stringify({ orderRef: order.orderRef, amountPkr: order.amountPkr, planId: order.planId, gateway: order.gateway, expiresAt: order.expiresAt }));
            }
            catch {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'could_not_create_order' }));
            }
        }
        if (req.method === 'POST' && req.url === '/v1/webhooks/jazzcash') {
            headers(res);
            const raw = await body(req);
            let fields;
            try {
                fields = JSON.parse(raw);
            }
            catch {
                const params = new URLSearchParams(raw);
                fields = Object.fromEntries(params.entries());
            }
            const salt = process.env.JALALAI_JAZZCASH_INTEGRITY_SALT ?? '';
            const validHash = salt && verifyJazzCashHash(fields, salt);
            if (!validHash) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'invalid_signature' }));
            }
            const orderRef = fields.pp_BillReference;
            const success = fields.pp_ResponseCode === '000';
            if (!success) {
                if (orderRef)
                    identity.rejectOrder(orderRef, `jazzcash_response_${fields.pp_ResponseCode}`);
                return res.end(JSON.stringify({ status: 'noted' }));
            }
            const result = identity.fulfillOrder(orderRef, fields.pp_RetreivalReferenceNo ?? fields.pp_TxnRefNo ?? 'unknown');
            if (!result.ok) {
                res.statusCode = 409;
                return res.end(JSON.stringify({ error: result.reason }));
            }
            return res.end(JSON.stringify({ status: 'ok' }));
        }
        if (req.method === 'POST' && req.url === '/v1/webhooks/easypaisa') {
            headers(res);
            const raw = await body(req);
            const signature = String(req.headers['x-easypaisa-signature'] ?? '');
            const secret = process.env.JALALAI_EASYPAISA_HASH_KEY ?? '';
            if (!secret || !verifyGenericHmacSignature(raw, signature, secret)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'invalid_signature' }));
            }
            let fields;
            try {
                fields = JSON.parse(raw);
            }
            catch {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'invalid_body' }));
            }
            const orderRef = fields.orderRefNum;
            const success = String(fields.responseCode) === '0000' || String(fields.status).toLowerCase() === 'success';
            if (!success) {
                if (orderRef)
                    identity.rejectOrder(orderRef, `easypaisa_response_${fields.responseCode}`);
                return res.end(JSON.stringify({ status: 'noted' }));
            }
            const result = identity.fulfillOrder(orderRef, fields.transactionId ?? 'unknown');
            if (!result.ok) {
                res.statusCode = 409;
                return res.end(JSON.stringify({ error: result.reason }));
            }
            return res.end(JSON.stringify({ status: 'ok' }));
        }
        if (req.method === 'GET' && req.url?.startsWith('/v1/tasks/')) {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            const id = decodeURIComponent(req.url.slice('/v1/tasks/'.length));
            const t = taskManager.get(id);
            if (t)
                return res.end(JSON.stringify(t));
            const r = runtime.get(id);
            if (r)
                return res.end(JSON.stringify(r));
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: 'task_not_found' }));
        }
        if (req.method === 'DELETE' && req.url?.startsWith('/v1/tasks/')) {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            const id = decodeURIComponent(req.url.slice('/v1/tasks/'.length));
            const r = runtime.get(id);
            if (r) {
                const out = runtime.cancel(id);
                return res.end(JSON.stringify({ ok: true, taskId: id, cancelled: true, status: out.status }));
            }
            const c = activeTasks.get(id);
            if (!c) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ error: 'task_not_running' }));
            }
            c.abort();
            return res.end(JSON.stringify({ ok: true, taskId: id, cancelled: true }));
        }
        if (req.method === 'GET' && req.url === '/v1/runtime/jobs') {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            return res.end(JSON.stringify({ jobs: runtime.list(), stats: runtime.stats() }));
        }
        if (req.method === 'GET' && req.url === '/v1/runtime/approvals') {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            return res.end(JSON.stringify({ approvals: runtime.approvalsList() }));
        }
        if (req.method === 'POST' && req.url?.startsWith('/v1/runtime/jobs/') && req.url.endsWith('/approve')) {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            const id = decodeURIComponent(req.url.slice('/v1/runtime/jobs/'.length, -'/approve'.length));
            return res.end(JSON.stringify(runtime.approve(id)));
        }
        if (req.method === 'POST' && req.url?.startsWith('/v1/runtime/jobs/') && req.url.endsWith('/reject')) {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            const id = decodeURIComponent(req.url.slice('/v1/runtime/jobs/'.length, -'/reject'.length));
            return res.end(JSON.stringify(runtime.reject(id)));
        }
        if (req.method === 'DELETE' && req.url?.startsWith('/v1/runtime/jobs/')) {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            const id = decodeURIComponent(req.url.slice('/v1/runtime/jobs/'.length));
            return res.end(JSON.stringify(runtime.cancel(id)));
        }
        if (req.method === 'GET' && req.url === '/v1/workflows') {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            return res.end(JSON.stringify({ workflows: workflowManager.list() }));
        }
        if (req.method === 'GET' && req.url?.startsWith('/v1/workflows/')) {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            const id = decodeURIComponent(req.url.slice('/v1/workflows/'.length));
            const w = workflowManager.get(id);
            if (!w) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ error: 'workflow_not_found' }));
            }
            return res.end(JSON.stringify(w));
        }
        if (req.method === 'DELETE' && req.url?.startsWith('/v1/workflows/')) {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            const id = decodeURIComponent(req.url.slice('/v1/workflows/'.length));
            const w = await workflowManager.cancel(id);
            return res.end(JSON.stringify(w));
        }
        if (req.method === 'POST' && req.url === '/v1/workflows') {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            const x = JSON.parse(await body(req));
            if (!Array.isArray(x.steps) || x.steps.length < 1 || x.steps.length > 20) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'steps_required_1_to_20' }));
            }
            if (x.steps.some((s) => typeof s?.input !== 'string' || !s.input.trim())) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'invalid_workflow_step' }));
            }
            const id = typeof x.id === 'string' && x.id.length < 200 ? x.id : `workflow-${Date.now()}`;
            const w = await workflowManager.create(id, x.steps);
            const run = async () => { await workflowManager.start(id); for (let i = 0; i < w.steps.length; i++) {
                const current = workflowManager.get(id);
                if (!current || current.status === 'cancelled')
                    break;
                const taskId = `${id}-${i + 1}-${Date.now()}`;
                await workflowManager.stepStart(id, i, taskId);
                const c = new AbortController();
                activeTasks.set(taskId, c);
                taskManager.create(taskId);
                taskManager.start(taskId);
                try {
                    const out = await orchestrator.run({ id: taskId, input: w.steps[i].input, mode: w.steps[i].mode ?? 'fast', permissions: DEFAULT_PERMISSIONS, attachments: [] }, c.signal);
                    taskManager.finish(taskId, out);
                    if (out.status !== 'completed')
                        throw new Error(out.errors.join('; ') || 'workflow_step_failed');
                    await workflowManager.stepFinish(id, i, out);
                }
                catch (e) {
                    taskManager.fail(taskId, e instanceof Error ? e.message : String(e));
                    const updated = await workflowManager.stepFail(id, i, e instanceof Error ? e.message : String(e), true);
                    if (updated.steps[i].status === 'queued') {
                        i--;
                    }
                    else
                        break;
                }
                finally {
                    activeTasks.delete(taskId);
                }
            } };
            run().catch(() => { });
            res.statusCode = 202;
            return res.end(JSON.stringify({ workflowId: id, status: 'running', statusUrl: `/v1/workflows/${encodeURIComponent(id)}` }));
        }
        if (req.method === 'GET' && req.url?.startsWith('/v1/events')) {
            if (!authorized(req)) {
                headers(res);
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            headers(res, 'text/event-stream');
            res.setHeader('cache-control', 'no-cache');
            res.setHeader('connection', 'keep-alive');
            const u = new URL(req.url, 'http://localhost');
            const taskId = u.searchParams.get('taskId');
            if (!taskId) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'taskId_required' }));
            }
            res.write(`data: ${JSON.stringify({ type: 'connected', taskId })}\n\n`);
            const off = orchestrator.events.on(e => { if (e.taskId === taskId)
                res.write(`data: ${JSON.stringify(e)}\n\n`); });
            req.on('close', off);
            return;
        }
        if (req.method === 'GET' && req.url === '/v1/knowledge') {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            return res.end(JSON.stringify({ documents: orchestrator.knowledge.listDocuments(), stats: orchestrator.knowledge.stats() }));
        }
        if (req.method === 'GET' && req.url?.startsWith('/v1/knowledge/search')) {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            const u = new URL(req.url, 'http://localhost');
            const q = u.searchParams.get('q') ?? '';
            const limit = Math.min(20, Math.max(1, Number(u.searchParams.get('limit') ?? 8)));
            if (!q.trim()) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'query_required' }));
            }
            return res.end(JSON.stringify({ query: q, results: await orchestrator.knowledge.search(q, limit) }));
        }
        if (req.method === 'POST' && req.url === '/v1/delegations') {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            const x = JSON.parse(await body(req));
            if (typeof x.input !== 'string' || !x.input.trim()) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'input_required' }));
            }
            return res.end(JSON.stringify({ delegations: orchestrator.delegator.plan({ input: x.input, domains: Array.isArray(x.domains) ? x.domains : undefined, maxAgents: Number(x.maxAgents ?? 4) }).map(d => ({ agent: d.agent, reason: d.reason })) }));
        }
        if (req.method === 'GET' && req.url === '/v1/capabilities') {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            return res.end(JSON.stringify({ capabilities: CREATIVE_CAPABILITIES }));
        }
        if (req.method === 'POST' && req.url === '/v1/analyze/csv') {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            const x = JSON.parse(await body(req));
            if (typeof x.csv !== 'string' || !x.csv.trim()) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'csv_required' }));
            }
            return res.end(JSON.stringify(analyzeCSV(x.csv)));
        }
        if (req.method === 'POST' && req.url === '/v1/creative/prompt') {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            const x = JSON.parse(await body(req));
            if (!['image', 'video', 'web', 'app'].includes(x.kind) || typeof x.prompt !== 'string' || !x.prompt.trim()) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'kind_and_prompt_required' }));
            }
            return res.end(JSON.stringify(normalizeCreativePrompt(x)));
        }
        if (req.method === 'POST' && req.url === '/v1/artifacts') {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            const x = JSON.parse(await body(req));
            if (!['txt', 'md', 'html', 'csv', 'docx', 'xlsx', 'pptx', 'pdf', 'svg'].includes(x.kind) || typeof x.name !== 'string' || typeof x.content !== 'string') {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'kind_name_content_required' }));
            }
            if (x.content.length > 2_000_000) {
                res.statusCode = 413;
                return res.end(JSON.stringify({ error: 'artifact_content_too_large' }));
            }
            const out = await createArtifact({ kind: x.kind, name: x.name, title: x.title, content: x.content, slides: Array.isArray(x.slides) ? x.slides : undefined });
            return res.end(JSON.stringify({ kind: out.kind, path: out.path, bytes: out.bytes, convertedFrom: out.convertedFrom }));
        }
        if (req.method === 'GET' && req.url === '/v1/tools') {
            headers(res);
            return res.end(JSON.stringify({ tools: [...builtinTools.list(), ...productionTools].map(t => ({ id: t.id, description: t.description, permission: t.permission })) }));
        }
        if (req.method === 'GET' && req.url === '/v1/models') {
            headers(res);
            return res.end(JSON.stringify({ models: await router.inventory(), routing: 'health + measured reliability + latency + profile scoring + bounded fallback' }));
        }
        if (req.method === 'POST' && req.url === '/v1/knowledge') {
            headers(res);
            if (!authorized(req)) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            const x = JSON.parse(await body(req));
            if (typeof x.name !== 'string' || typeof x.text !== 'string' || !x.name.trim() || !x.text.trim()) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'name_and_text_required' }));
            }
            if (x.text.length > 1_000_000) {
                res.statusCode = 413;
                return res.end(JSON.stringify({ error: 'knowledge_document_too_large' }));
            }
            const out = await orchestrator.knowledge.upsertDocument({ id: typeof x.id === 'string' ? x.id : undefined, name: x.name, source: typeof x.source === 'string' ? x.source : `manual://${x.name}`, text: x.text, mimeType: typeof x.mimeType === 'string' ? x.mimeType : undefined, metadata: typeof x.metadata === 'object' && x.metadata ? x.metadata : undefined });
            return res.end(JSON.stringify(out));
        }
        if (req.method === 'POST' && req.url?.startsWith('/v1/tasks')) {
            headers(res);
            const taskSessionUser = resolveUser(req);
            if (!authorized(req) && !taskSessionUser) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'unauthorized' }));
            }
            const key = taskSessionUser ? `user:${taskSessionUser.userId}` : String(req.headers['x-client-id'] ?? req.socket.remoteAddress ?? 'anonymous');
            if (!limiter.allow(key)) {
                res.statusCode = 429;
                return res.end(JSON.stringify({ error: 'rate_limited' }));
            }
            if (taskSessionUser) {
                const entitlementDecision = identity.decidePromptForUser(taskSessionUser.userId);
                if (!entitlementDecision.allowed) {
                    res.statusCode = 402;
                    return res.end(JSON.stringify({ error: entitlementDecision.reason, remaining: entitlementDecision.remaining }));
                }
                identity.recordPromptUsage(taskSessionUser.userId);
            }
            const x = JSON.parse(await body(req));
            if (typeof x.input !== 'string' || !x.input.trim()) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'input_required' }));
            }
            if (x.input.length > 200_000) {
                res.statusCode = 413;
                return res.end(JSON.stringify({ error: 'input_too_large' }));
            }
            if (x.attachments !== undefined && !Array.isArray(x.attachments)) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'attachments_invalid' }));
            }
            if (Array.isArray(x.attachments)) {
                if (x.attachments.length > MAX_FILES) {
                    res.statusCode = 413;
                    return res.end(JSON.stringify({ error: 'too_many_attachments' }));
                }
                for (const a of x.attachments) {
                    if (typeof a?.name !== 'string' || typeof a?.text !== 'string') {
                        res.statusCode = 400;
                        return res.end(JSON.stringify({ error: 'attachment_invalid' }));
                    }
                    if (!ALLOWED_TEXT_TYPES.has(String(a.type ?? ''))) {
                        res.statusCode = 415;
                        return res.end(JSON.stringify({ error: `unsupported_attachment_type:${a.name}` }));
                    }
                    if (a.text.length > MAX_FILE_TEXT) {
                        res.statusCode = 413;
                        return res.end(JSON.stringify({ error: `attachment_too_large:${a.name}` }));
                    }
                }
            }
            const mode = x.mode === 'deep' || x.mode === 'verified' ? x.mode : 'fast';
            const id = typeof x.id === 'string' && x.id.length < 200 ? x.id : `task-${Date.now()}`;
            const controller = new AbortController();
            activeTasks.set(id, controller);
            taskManager.create(id);
            const requireApproval = x.requireApproval === true;
            const job = runtime.enqueue(id, requireApproval, Number(x.maxAttempts ?? 3), { input: x.input, mode, language: x.language, context: x.context, attachments: Array.isArray(x.attachments) ? x.attachments : [], permissions: { ...DEFAULT_PERMISSIONS, ...x.permissions } });
            const runTask = async () => { taskManager.start(id); try {
                const out = await runtime.wait(id);
                taskManager.finish(id, out);
                return out;
            }
            catch (e) {
                taskManager.fail(id, e instanceof Error ? e.message : String(e));
                throw e;
            }
            finally {
                activeTasks.delete(id);
            } };
            const u = new URL(req.url, 'http://localhost');
            if (u.searchParams.get('async') === 'true' || requireApproval) {
                runTask().catch(() => { });
                res.statusCode = 202;
                return res.end(JSON.stringify({ taskId: id, status: job.status, statusUrl: `/v1/tasks/${encodeURIComponent(id)}`, runtimeStatusUrl: `/v1/runtime/jobs/${encodeURIComponent(id)}`, eventsUrl: `/v1/events?taskId=${encodeURIComponent(id)}` }));
            }
            try {
                return res.end(JSON.stringify(await runTask()));
            }
            catch (e) {
                throw e;
            }
        }
        headers(res);
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'not_found' }));
    }
    catch (e) {
        headers(res);
        res.statusCode = 400;
        res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
    }
});
server.listen(Number(process.env.PORT ?? 8787), () => console.log('JalalAI Command Center listening on :' + (process.env.PORT ?? 8787)));

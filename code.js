import { Script, createContext } from 'node:vm';
export const codeSandboxTool = { id: 'code.sandbox', description: 'Run a deliberately restricted JavaScript expression in a timeout-limited VM; no imports, network, filesystem, process, or globals', permission: 'code', async execute(input, ctx) { if (!ctx.permissions.code)
        throw new Error('Permission denied: code'); const code = String(input); if (code.length > 4000)
        throw new Error('Code too long'); if (/\b(require|import|process|fetch|XMLHttpRequest|WebSocket|Deno|Bun|child_process|fs|net|http|https)\b/.test(code))
        throw new Error('Restricted API/token detected'); const sandbox = createContext({ Math, JSON, Number, String, Boolean, Array, Object }); const script = new Script(`"use strict";(${code})`); const result = script.runInContext(sandbox, { timeout: 500 }); return { result: typeof result === 'string' ? result : JSON.stringify(result) }; } };

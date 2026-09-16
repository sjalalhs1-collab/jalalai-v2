import { MasterOrchestrator } from './core/orchestrator.js';
import { LocalDemoProvider } from './models/router.js';
import { DEFAULT_PERMISSIONS } from './security/permissions.js';
const o = new MasterOrchestrator();
o.router.register(new LocalDemoProvider());
const r = await o.run({ id: 'demo-1', input: 'Explain how an HR payroll audit should be planned', mode: 'fast', permissions: DEFAULT_PERMISSIONS });
console.log(JSON.stringify(r, null, 2));

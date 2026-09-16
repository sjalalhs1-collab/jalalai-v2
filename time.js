export const timeTool = { id: 'time.now', description: 'Return current UTC time', permission: 'web', async execute() { return { iso: new Date().toISOString(), unixMs: Date.now() }; } };

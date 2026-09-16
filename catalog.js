export const MODEL_CATALOG = [
    { id: 'gpt-5', provider: 'openai', capabilities: ['reasoning', 'coding', 'vision', 'multilingual'], quality: 0.96, speed: .82, cost: .65, context: 200000 },
    { id: 'claude-sonnet', provider: 'anthropic', capabilities: ['reasoning', 'coding', 'writing', 'multilingual'], quality: .94, speed: .8, cost: .7, context: 200000 },
    { id: 'gemini', provider: 'google', capabilities: ['reasoning', 'vision', 'multilingual', 'long-context'], quality: .92, speed: .86, cost: .72, context: 1000000 }
];

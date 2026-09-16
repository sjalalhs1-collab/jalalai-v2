export async function executeRequestedTool(name, input, permissions, registry, taskId) { const tool = registry.get(name); if (!tool)
    throw new Error(`tool_not_found:${name}`); return tool.execute(input, { taskId, permissions }); }

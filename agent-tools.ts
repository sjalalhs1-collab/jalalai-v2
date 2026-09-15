import type {PermissionSet} from '../contracts.js';import type {ToolRegistry} from '../tools/registry.js';
export async function executeRequestedTool(name:string,input:unknown,permissions:PermissionSet,registry:ToolRegistry,taskId:string){const tool=registry.get(name);if(!tool)throw new Error(`tool_not_found:${name}`);return tool.execute(input,{taskId,permissions})}

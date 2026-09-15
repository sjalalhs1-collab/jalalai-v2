import type {PermissionSet} from '../contracts.js';
export interface ToolContext{taskId:string;permissions:PermissionSet}
export interface Tool{id:string;description:string;permission:keyof PermissionSet;execute(input:unknown,ctx:ToolContext):Promise<unknown>}
export class ToolRegistry{private tools=new Map<string,Tool>();register(t:Tool){this.tools.set(t.id,t);return this}get(id:string){return this.tools.get(id)}list(){return [...this.tools.values()]}}

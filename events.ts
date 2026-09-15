export type AgentEvent={taskId:string;type:'status'|'plan'|'files'|'evidence'|'expert'|'token'|'critique'|'tool'|'final'|'error';data:unknown};
export class EventBus {private listeners=new Set<(e:AgentEvent)=>void>();on(fn:(e:AgentEvent)=>void){this.listeners.add(fn);return()=>this.listeners.delete(fn)}emit(e:AgentEvent){for(const fn of this.listeners)fn(e)}}

import type {TaskResult} from '../contracts.js';
export type LiveTaskStatus='queued'|'running'|'completed'|'failed'|'cancelled';
export interface LiveTask {id:string;status:LiveTaskStatus;startedAt?:number;finishedAt?:number;result?:TaskResult;error?:string}
export class TaskManager { private tasks=new Map<string,LiveTask>();
 create(id:string){const t={id,status:'queued' as const};this.tasks.set(id,t);return t}
 start(id:string){const t=this.tasks.get(id);if(!t)throw new Error('task_not_found');t.status='running';t.startedAt=Date.now();return t}
 finish(id:string,result:TaskResult){const t=this.tasks.get(id);if(!t)return;t.result=result;t.finishedAt=Date.now();t.status=result.status==='completed'?'completed':result.errors.some(e=>e==='task_cancelled')?'cancelled':'failed'}
 fail(id:string,error:string){const t=this.tasks.get(id);if(!t)return;t.error=error;t.finishedAt=Date.now();t.status=error==='task_cancelled'?'cancelled':'failed'}
 get(id:string){return this.tasks.get(id)}
 list(){return [...this.tasks.values()].sort((a,b)=>(b.startedAt??0)-(a.startedAt??0))}
}

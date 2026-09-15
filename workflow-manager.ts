import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
function parent(p:string){const i=Math.max(p.lastIndexOf('/'),p.lastIndexOf('\\'));return i>0?p.slice(0,i):'.'}
export type WorkflowStatus='queued'|'running'|'completed'|'failed'|'cancelled';
export interface WorkflowStep{id:string;input:string;mode?:'fast'|'deep'|'verified';status:'queued'|'running'|'completed'|'failed';taskId?:string;result?:unknown;error?:string;attempts:number;}
export interface Workflow{id:string;status:WorkflowStatus;createdAt:number;updatedAt:number;steps:WorkflowStep[];current:number;}
export class WorkflowManager{
 private items=new Map<string,Workflow>();constructor(private path=process.env.JALALAI_WORKFLOW_PATH??'./data/jalalai-workflows.json'){}
 async load(){try{if(existsSync(this.path)){const raw=JSON.parse(readFileSync(this.path,'utf8'));for(const w of Array.isArray(raw)?raw:[])this.items.set(w.id,w)}}catch{}return this}
 private async persist(){try{mkdirSync(parent(this.path),{recursive:true});writeFileSync(this.path,JSON.stringify([...this.items.values()],null,2))}catch{}return this}
 async create(id:string,steps:Array<{id?:string;input:string;mode?:'fast'|'deep'|'verified'}>){if(this.items.has(id))throw new Error('workflow_exists');const w:Workflow={id,status:'queued',createdAt:Date.now(),updatedAt:Date.now(),current:0,steps:steps.map((s,i)=>({id:s.id??`step-${i+1}`,input:s.input,mode:s.mode,status:'queued',attempts:0}))};this.items.set(id,w);await this.persist();return w}
 async start(id:string){const w=this.items.get(id);if(!w)throw new Error('workflow_not_found');w.status='running';w.updatedAt=Date.now();await this.persist();return w}
 async stepStart(id:string,index:number,taskId:string){const w=this.items.get(id);if(!w||!w.steps[index])throw new Error('workflow_step_not_found');w.current=index;w.steps[index].status='running';w.steps[index].taskId=taskId;w.steps[index].attempts++;w.updatedAt=Date.now();await this.persist();return w}
 async stepFinish(id:string,index:number,result:unknown){const w=this.items.get(id);if(!w||!w.steps[index])throw new Error('workflow_step_not_found');w.steps[index].status='completed';w.steps[index].result=result;w.current=index+1;if(w.current>=w.steps.length)w.status='completed';w.updatedAt=Date.now();await this.persist();return w}
 async stepFail(id:string,index:number,error:string,retry=true){const w=this.items.get(id);if(!w||!w.steps[index])throw new Error('workflow_step_not_found');w.steps[index].error=error;if(retry&&w.steps[index].attempts<3){w.steps[index].status='queued'}else{w.steps[index].status='failed';w.status='failed'}w.updatedAt=Date.now();await this.persist();return w}
 async cancel(id:string){const w=this.items.get(id);if(!w)throw new Error('workflow_not_found');w.status='cancelled';w.updatedAt=Date.now();await this.persist();return w}
 get(id:string){return this.items.get(id)}list(){return [...this.items.values()].sort((a,b)=>b.createdAt-a.createdAt)}async recover(){for(const w of this.items.values())if(w.status==='running'){w.status='queued';w.updatedAt=Date.now()}await this.persist();return this.list()}
}

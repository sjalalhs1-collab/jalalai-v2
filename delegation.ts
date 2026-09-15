import type {AgentDefinition, AgentRegistry} from './registry.js';

export interface DelegationRequest { input:string; domains?:string[]; maxAgents?:number }
export interface Delegation { agent:AgentDefinition; reason:string }

export class AgentDelegator {
  constructor(private registry:AgentRegistry){}
  plan(req:DelegationRequest):Delegation[]{
    const domains=req.domains?.length?req.domains:this.registry.detect(req.input);
    const agents=this.registry.select(domains,Math.min(8,Math.max(1,req.maxAgents??4)));
    if(!agents.length){const fallback=this.registry.get('expert.general-knowledge');return fallback?[{agent:fallback,reason:'fallback generalist'}]:[]}
    return agents.map((agent,i)=>({agent,reason:i===0?'primary domain specialist':'independent cross-check specialist'}));
  }
}

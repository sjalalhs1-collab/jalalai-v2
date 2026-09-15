import type {AgentOutput} from '../contracts.js';
export interface DebateReport{consensus:string;disagreements:string[];score:number}
function normalize(s:string){return s.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>3)}
export class DebateEngine {
 review(outputs:AgentOutput[]):DebateReport{
  if(!outputs.length)return{consensus:'',disagreements:['No expert outputs'],score:0};
  const disagreements:string[]=[]; const tokenSets=outputs.map(o=>new Set(normalize(o.text)));
  for(let i=0;i<outputs.length;i++)for(let j=i+1;j<outputs.length;j++){let common=0;for(const t of tokenSets[i])if(tokenSets[j].has(t))common++;const union=new Set([...tokenSets[i],...tokenSets[j]]).size;const overlap=union?common/union:0;if(overlap<.2)disagreements.push(`${outputs[i].expert} and ${outputs[j].expert} show low textual agreement (${Math.round(overlap*100)}%).`)}
  const avg=outputs.reduce((s,o)=>s+o.confidence,0)/outputs.length;return{consensus:outputs.map(o=>`[${o.expert}]\n${o.text}`).join('\n\n'),disagreements,score:Math.max(0,Math.min(1,avg-disagreements.length*.08))};
 }
}

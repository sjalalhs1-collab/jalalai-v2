import type {TaskRequest, AgentOutput, Evidence} from '../contracts.js';
import {CriticAgent} from '../critique/critic.js';
import {ModelRouter} from '../models/router.js';
export class SelfCorrectionLoop {
  constructor(private router:ModelRouter, private critic=new CriticAgent()){}
  async improve(req:TaskRequest, answer:string, evidence:Evidence[]):Promise<{answer:string;evidence:Evidence[];iterations:number;score:number;issues:string[]}> {
    let current=answer, ev=evidence, iterations=0, report=this.critic.review(current,ev,req.mode);
    while(!report.pass && iterations<2){ iterations++; const prompt=`Review and improve this answer. Do not invent facts or sources.\nIssues: ${report.issues.join('; ')}\nMissing evidence: ${report.missingEvidence.join('; ')}\nOriginal task: ${req.input}\nAnswer:\n${current}`;
      try { const out=await this.router.generate({messages:[{role:'system',content:'You are JalalAI self-correction editor. Preserve correct content, fix errors, clearly mark uncertainty.'},{role:'user',content:prompt}]},'quality'); current=out.text||current; report=this.critic.review(current,ev,req.mode); }
      catch { break; }
    }
    return {answer:current,evidence:ev,iterations,score:report.score,issues:[...report.issues,...report.missingEvidence]};
  }
}

import {VectorIndex} from './vector.js';

function terms(s:string){return new Set(s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu,' ').split(/\s+/).filter(x=>x.length>1))}
function lexical(a:string,b:string){const A=terms(a),B=terms(b);if(!A.size||!B.size)return 0;let hit=0;for(const x of A)if(B.has(x))hit++;return hit/Math.sqrt(A.size*B.size)}
export interface HybridHit<T>{score:number;vectorScore:number;lexicalScore:number;payload:T}
export class HybridIndex<T>{
 private vector=new VectorIndex<T>(); private texts=new Map<string,string>();
 async upsert(id:string,text:string,payload:T){this.texts.set(id,text);await this.vector.upsert(id,text,payload)}
 async search(query:string,limit=8):Promise<HybridHit<T>[]> {
  const candidates=await this.vector.search(query,Math.max(limit*4,20));
  return candidates.map(c=>{const l=lexical(query,this.texts.get(c.id)??c.text);return{score:.65*c.score+.35*l,vectorScore:c.score,lexicalScore:l,payload:c.payload}}).sort((a,b)=>b.score-a.score).slice(0,limit)
 }
 size(){return this.texts.size}
}

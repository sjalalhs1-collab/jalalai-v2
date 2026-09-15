import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import type {Evidence} from '../contracts.js';
export interface MemoryRecord{id:string;taskId:string;content:string;tags:string[];createdAt:number;evidence:Evidence[]}
export interface MemoryStore{put(r:MemoryRecord):MemoryRecord;search(q:string,limit?:number):MemoryRecord[];all():MemoryRecord[]}
export class InMemoryStore implements MemoryStore {private items:MemoryRecord[]=[];put(r:MemoryRecord){this.items.push(r);return r}search(q:string,limit=5){const terms=q.toLowerCase().split(/\W+/).filter(Boolean);return this.items.map(x=>({x,score:terms.filter(t=>(x.content+' '+x.tags.join(' ')).toLowerCase().includes(t)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.x)}all(){return [...this.items]}}
export class JsonFileStore extends InMemoryStore {
  constructor(private filePath='./data/jalalai-memory.json'){super();this.load()}
  private load(){try{if(existsSync(this.filePath)){const rows=JSON.parse(readFileSync(this.filePath,'utf8'));for(const r of rows)super.put(r)}}catch{} }
  override put(r:MemoryRecord){const out=super.put(r);try{writeFileSync(this.filePath,JSON.stringify(this.all(),null,2))}catch{}return out}
}

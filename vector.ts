export interface VectorItem<T=unknown>{id:string;vector:number[];text:string;payload:T}
export interface EmbeddingProvider{embed(text:string):Promise<number[]>}
export class HashEmbedding implements EmbeddingProvider{
 constructor(private dims=128){}
 async embed(text:string){const v=new Array(this.dims).fill(0);const words=text.toLowerCase().split(/\W+/).filter(Boolean);for(const w of words){let h=2166136261;for(let i=0;i<w.length;i++){h^=w.charCodeAt(i);h=Math.imul(h,16777619)};v[Math.abs(h)%this.dims]+=1}const n=Math.hypot(...v)||1;return v.map(x=>x/n)}
}
export function cosine(a:number[],b:number[]){let d=0,na=0,nb=0;for(let i=0;i<Math.min(a.length,b.length);i++){d+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i]}return na&&nb?d/Math.sqrt(na*nb):0}
export class VectorIndex<T=unknown>{private items:VectorItem<T>[]=[];constructor(private embeddings:EmbeddingProvider=new HashEmbedding()){}
 async upsert(id:string,text:string,payload:T){const vector=await this.embeddings.embed(text);const old=this.items.findIndex(x=>x.id===id);const item={id,vector,text,payload};if(old>=0)this.items[old]=item;else this.items.push(item)}
 add(item:{id:string;text:string;vector:number[];payload?:T}){this.items.push({id:item.id,text:item.text,vector:item.vector,payload:item.payload as T});return this}
 search(query:number[],limit?:number):{item:VectorItem<T>;score:number}[];
 search(query:string,limit?:number):Promise<(VectorItem<T>&{score:number})[]>;
 search(query:string|number[],limit=5):any{if(Array.isArray(query)) return this.items.map(x=>({item:x,score:cosine(query,x.vector)})).sort((a,b)=>b.score-a.score).slice(0,limit);return this.searchAsync(query,limit)}
 private async searchAsync(query:string,limit=5){const q=await this.embeddings.embed(query);return this.items.map(x=>({...x,score:cosine(q,x.vector)})).sort((a,b)=>b.score-a.score).slice(0,limit)}
 size(){return this.items.length}
}

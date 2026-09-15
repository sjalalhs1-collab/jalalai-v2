import type {ModelProvider,ModelRequest,ModelResponse,StreamChunk} from '../models/provider.js';
export class OpenAIProvider implements ModelProvider {
 id='openai';
 constructor(private apiKey=process.env.OPENAI_API_KEY??'',private defaultModel=process.env.OPENAI_MODEL??'gpt-5'){}
 async health(){return Boolean(this.apiKey)} async listModels(){return [this.defaultModel]}
 private body(r:ModelRequest,stream=false){const b:any={model:r.model??this.defaultModel,input:r.messages.map(m=>({role:m.role,content:m.content})),stream};if(r.temperature!==undefined)b.temperature=r.temperature;if(r.maxTokens)b.max_output_tokens=r.maxTokens;return b}
 async generate(r:ModelRequest):Promise<ModelResponse>{
  if(!this.apiKey)throw new Error('OPENAI_API_KEY is not configured');const t=Date.now();
  const res=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(this.body(r)),signal:r.signal});
  const data:any=await res.json();if(!res.ok)throw new Error(`OpenAI ${res.status}: ${data?.error?.message??'request failed'}`);
  return{provider:this.id,model:data.model??r.model??this.defaultModel,text:data.output_text??'',latencyMs:Date.now()-t,inputTokens:data.usage?.input_tokens,outputTokens:data.usage?.output_tokens,raw:data}
 }
 async generateStream(r:ModelRequest,onChunk:(c:StreamChunk)=>void):Promise<ModelResponse>{
  if(!this.apiKey)throw new Error('OPENAI_API_KEY is not configured');const t=Date.now();
  const res=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(this.body(r,true)),signal:r.signal});
  if(!res.ok){const data:any=await res.json();throw new Error(`OpenAI ${res.status}: ${data?.error?.message??'stream request failed'}`)}
  if(!res.body)throw new Error('OpenAI streaming body unavailable');
  const reader=res.body.getReader(),decoder=new TextDecoder();let buffer='',text='',model=r.model??this.defaultModel;let usage:any;
  const consume=(raw:string)=>{buffer+=raw;const lines=buffer.split('\n');buffer=lines.pop()??'';for(const line of lines){if(!line.startsWith('data:'))continue;const payload=line.slice(5).trim();if(!payload||payload==='[DONE]')continue;let d:any;try{d=JSON.parse(payload)}catch{continue}if(d.type==='response.output_text.delta'&&d.delta){text+=d.delta;onChunk({type:'text',text:d.delta})}if(d.type==='response.completed'){model=d.response?.model??model;usage=d.response?.usage}}};
  while(true){const {value,done}=await reader.read();if(done)break;consume(decoder.decode(value,{stream:true}))}
  const out:ModelResponse={provider:this.id,model,text,latencyMs:Date.now()-t,inputTokens:usage?.input_tokens,outputTokens:usage?.output_tokens};onChunk({type:'done',response:out});return out
 }
}

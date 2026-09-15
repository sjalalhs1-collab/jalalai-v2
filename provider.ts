export interface ModelRequest{model?:string;messages:{role:'system'|'user'|'assistant';content:string}[];temperature?:number;maxTokens?:number;signal?:AbortSignal}
export interface ModelResponse{provider:string;model:string;text:string;inputTokens?:number;outputTokens?:number;latencyMs:number;raw?:unknown}
export interface StreamChunk{type:'text'|'done';text?:string;response?:ModelResponse}
export interface ModelProvider{id:string;listModels():Promise<string[]>;generate(request:ModelRequest):Promise<ModelResponse>;health():Promise<boolean>;generateStream?(request:ModelRequest,onChunk:(chunk:StreamChunk)=>void):Promise<ModelResponse>}

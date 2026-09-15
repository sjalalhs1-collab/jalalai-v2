export type CreativePromptKind='image'|'video'|'web'|'app';
export interface CreativePrompt{kind:CreativePromptKind;prompt:string;negative?:string;format?:string}
export function normalizeCreativePrompt(p:CreativePrompt){const common=`Objective: ${p.prompt.trim()}\nOutput: ${p.format??'high quality, production-ready result'}\nConstraints: accurate, clear, safe, no invented brand assets unless supplied.`;return {kind:p.kind,prompt:common,negative:p.negative??''}}

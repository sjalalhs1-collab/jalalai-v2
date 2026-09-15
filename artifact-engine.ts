import {mkdir,writeFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
const exec=(file:string,args:string[],options:any={})=>new Promise<void>((resolve,reject)=>execFile(file,args,options,(err)=>err?reject(err):resolve()));
export type ArtifactKind='txt'|'md'|'html'|'csv'|'docx'|'xlsx'|'pptx'|'pdf'|'svg';
export interface ArtifactRequest{kind:ArtifactKind;name:string;title?:string;content:string;sheet?:string;slides?:string[]}
export interface ArtifactResult{kind:ArtifactKind;path:string;bytes:number;convertedFrom?:string}
function safeName(n:string){return n.replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,120)||'artifact'}
export async function createArtifact(r:ArtifactRequest,dir=join(process.cwd(),'data','artifacts')):Promise<ArtifactResult>{
 await mkdir(dir,{recursive:true}); const base=safeName(r.name).replace(/\.[^.]+$/,''); const out=join(dir,base+'.'+r.kind);
 if(['docx','xlsx','pptx'].includes(r.kind)){
   const payload=JSON.stringify({kind:r.kind,out,title:r.title,content:r.content,sheet:r.sheet,slides:r.slides});
   const spec=join(dir,base+'.artifact.json'); await writeFile(spec,payload,'utf8'); await exec(process.env.JALALAI_PYTHON??'python3',[join(process.cwd(),'scripts_artifact_writer.py'),spec],{timeout:30000});
 } else if(r.kind==='pdf'){
   const html=join(dir,base+'.html'); await writeFile(html,`<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial;margin:40px;line-height:1.5}</style></head><body>${r.content}</body></html>`,'utf8');
   await exec('libreoffice',['--headless','--convert-to','pdf','--outdir',dir,html],{timeout:30000});
 } else await writeFile(out,r.content,'utf8');
 const b=await stat(out); return {kind:r.kind,path:out,bytes:b.size};
}

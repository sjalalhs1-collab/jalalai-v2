declare module 'node:http' { export function createServer(handler:any): any; }
declare module 'node:fs' { export function readFileSync(path:string,encoding:string):string; export function writeFileSync(path:string,data:string):void; export function existsSync(path:string):boolean; export function mkdirSync(path:string,opts?:any):void; export function rmSync(path:string,opts?:any):void; }
declare module 'node:fs/promises' { export function readFile(path:string,encoding?:any):Promise<any>; export function mkdir(path:string,opts?:any):Promise<void>; export function writeFile(path:string,data:any,encoding?:any):Promise<void>; export function stat(path:string):Promise<{size:number}>; }
declare module 'node:path' { export function join(...parts:string[]):string; export function extname(path:string):string; }
declare const process:{env:Record<string,string|undefined>;cwd():string};

declare module 'node:vm' { export function createContext(sandbox?: any): any; export class Script { constructor(code:string); runInContext(context:any, options?:any): any; } }

declare module 'node:child_process' { export function execFile(file:string,args:string[],options:any,callback:(err:any,stdout:any,stderr:any)=>void):any; }

declare class Buffer {
  static from(input: string | ArrayBuffer, encoding?: string): Buffer;
  static alloc(size: number): Buffer;
  toString(encoding?: string): string;
  readonly length: number;
}
declare module 'node:crypto' {
  export function randomBytes(size: number): Buffer;
  export function scryptSync(password: string, salt: string, keylen: number, options?: any): Buffer;
  export function timingSafeEqual(a: Buffer, b: Buffer): boolean;
  export function createHash(algorithm: string): { update(data: string): any; digest(encoding: string): string };
  export function createHmac(algorithm: string, key: string): { update(data: string): any; digest(encoding: string): string };
}

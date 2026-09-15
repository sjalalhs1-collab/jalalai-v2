import type {Tool} from './registry.js';
export const timeTool:Tool={id:'time.now',description:'Return current UTC time',permission:'web',async execute(){return {iso:new Date().toISOString(),unixMs:Date.now()}}};

import test from 'node:test';
import assert from 'node:assert/strict';
import {MasterOrchestrator} from '../dist/core/orchestrator.js';
import {ModelRouter,LocalDemoProvider} from '../dist/models/router.js';

test('v0.9 accepts text attachments and emits file event', async()=>{
  const router=new ModelRouter().register(new LocalDemoProvider());
  const o=new MasterOrchestrator(undefined,router);
  let saw=false; o.events.on(e=>{if(e.type==='files') saw=true});
  const r=await o.run({id:'v09-file',input:'Summarize this file',mode:'fast',attachments:[{id:'a1',name:'notes.txt',type:'text/plain',text:'Important project notes.',size:23}],permissions:{web:false,files:true,code:false,externalActions:false,sensitiveData:false}});
  assert.equal(saw,true); assert.equal(r.taskId,'v09-file');
});

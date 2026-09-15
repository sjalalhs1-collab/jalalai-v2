import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelRouter,LocalDemoProvider} from '../dist/models/router.js';
import {MasterOrchestrator} from '../dist/core/orchestrator.js';

test('v1.1 router emits stream chunks with fallback providers', async()=>{
  const router=new ModelRouter().register(new LocalDemoProvider());
  const chunks=[];
  const out=await router.generateStream({messages:[{role:'user',content:'hello'}]},'speed',c=>chunks.push(c));
  assert.equal(out.provider,'local-demo');
  assert.ok(chunks.some(c=>c.type==='text'));
  assert.ok(chunks.some(c=>c.type==='done'));
});

test('v1.1 orchestrator executes independent expert steps concurrently', async()=>{
  const router=new ModelRouter().register(new LocalDemoProvider());
  const o=new MasterOrchestrator(undefined,router);
  const events=[];o.events.on(e=>events.push(e));
  const r=await o.run({id:'v11-parallel',input:'Analyse HR payroll and accounting controls',mode:'fast',permissions:{web:false,files:false,code:false,externalActions:false,sensitiveData:false}});
  assert.equal(r.taskId,'v11-parallel');
  assert.ok(events.some(e=>e.type==='token'));
  assert.ok(events.filter(e=>e.type==='expert').length>=2);
});

test('v1.1 abort signal fails a cancelled task', async()=>{
  const router=new ModelRouter().register(new LocalDemoProvider());
  const o=new MasterOrchestrator(undefined,router);const c=new AbortController();c.abort();
  const r=await o.run({id:'v11-cancel',input:'do work',mode:'fast'},c.signal);
  assert.equal(r.status,'failed');assert.ok(r.errors.join(' ').includes('task_cancelled'));
});

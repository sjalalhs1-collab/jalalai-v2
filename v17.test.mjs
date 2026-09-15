import test from 'node:test';
import assert from 'node:assert/strict';
import {AgentDelegator} from '../dist/agents/delegation.js';
import {AgentRegistry} from '../dist/agents/registry.js';
import {HybridIndex} from '../dist/rag/hybrid.js';
import {createProductionTools} from '../dist/tools/production.js';

test('v1.7 delegation creates bounded specialist fan-out',()=>{
  const d=new AgentDelegator(new AgentRegistry()).plan({input:'HR payroll hiring policy',maxAgents:8});
  assert.ok(d.length>=1&&d.length<=8); assert.ok(d.every(x=>x.agent.id.startsWith('expert.')));
});
test('v1.7 hybrid knowledge retrieval combines lexical and vector signals',async()=>{
  const h=new HybridIndex(); await h.upsert('a','Pakistan payroll salary tax rules',{id:'a'}); await h.upsert('b','frontend javascript design',{id:'b'});
  const r=await h.search('salary tax payroll',1); assert.equal(r[0].payload.id,'a'); assert.ok(r[0].lexicalScore>0);
});
test('v1.7 production browser automation is explicitly permissioned',()=>{
  const t=createProductionTools()[0]; assert.equal(t.id,'browser.automate'); assert.equal(t.permission,'web');
});

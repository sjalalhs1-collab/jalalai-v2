import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentRegistry } from '../dist/agents/registry.js';
import { Planner } from '../dist/core/planner.js';
import { Verifier } from '../dist/verification/verifier.js';

test('registry contains 34 expert domains',()=>assert.equal(new AgentRegistry().list().length,34));
test('planner detects HR and payroll',()=>{const p=new Planner(new AgentRegistry()).plan({id:'1',input:'Create an HR payroll audit plan',mode:'fast'});assert.ok(p.steps.some(s=>s.expert==='expert.hr'));assert.ok(p.steps.some(s=>s.expert==='expert.payroll'));});
test('verified mode rejects answer without evidence',()=>assert.equal(new Verifier().verify('answer',[],'verified').pass,false));

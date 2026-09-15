import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenAIProvider } from '../dist/providers/openai.js';
import { AnthropicProvider } from '../dist/providers/anthropic.js';
import { GoogleProvider } from '../dist/providers/google.js';
import { InMemoryStore } from '../dist/memory/store.js';

test('providers are disabled safely without keys',async()=>{assert.equal(await new OpenAIProvider('').health(),false);assert.equal(await new AnthropicProvider('').health(),false);assert.equal(await new GoogleProvider('').health(),false)});
test('memory store retrieves matching records',()=>{const m=new InMemoryStore();m.put({id:'1',taskId:'1',content:'HR payroll audit policy',tags:['hr'],createdAt:Date.now(),evidence:[]});assert.equal(m.search('payroll')[0].id,'1')});

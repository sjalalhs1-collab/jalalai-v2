import test from 'node:test'; import assert from 'node:assert/strict'; import {analyzeCSV,normalizeCreativePrompt,CREATIVE_CAPABILITIES} from '../dist/index.js';
test('v1.9 data analysis',()=>{const r=analyzeCSV('name,sales\nA,10\nB,20\nC,30');assert.equal(r.rows,3);assert.equal(r.numeric.sales.mean,20);assert.equal(r.numeric.sales.max,30)});
test('v1.9 creative capability catalog',()=>{assert.ok(CREATIVE_CAPABILITIES.some(x=>x.id==='office.word'));assert.ok(CREATIVE_CAPABILITIES.some(x=>x.id==='video.generate'));assert.ok(CREATIVE_CAPABILITIES.some(x=>x.id==='graphics.svg'))});
test('v1.9 prompt normalization',()=>{const r=normalizeCreativePrompt({kind:'image',prompt:'professional office dashboard'});assert.match(r.prompt,/Objective:/)});

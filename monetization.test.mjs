import test from 'node:test';
import assert from 'node:assert/strict';
import {decidePromptUsage,isValidPlanId} from '../dist/index.js';

test('monetization: free plan allows prompts below daily limit',()=>{
  const result=decidePromptUsage({userId:'u1',planId:'free',status:'active',platform:null,renewsAt:null,expiresAt:null,promptsUsedToday:39,dailyPromptLimit:40});
  assert.deepEqual(result,{allowed:true,reason:'within_limit',remaining:1});
});

test('monetization: free plan blocks the 41st prompt',()=>{
  const result=decidePromptUsage({userId:'u1',planId:'free',status:'active',platform:null,renewsAt:null,expiresAt:null,promptsUsedToday:40,dailyPromptLimit:40});
  assert.deepEqual(result,{allowed:false,reason:'daily_limit_reached',remaining:0});
});

test('monetization: paid plans use fair-use unlimited mode',()=>{
  const result=decidePromptUsage({userId:'u1',planId:'pro',status:'active',platform:'web',renewsAt:null,expiresAt:null,promptsUsedToday:999999,dailyPromptLimit:null});
  assert.deepEqual(result,{allowed:true,reason:'within_limit',remaining:null});
});

test('monetization: invalid or expired entitlement is rejected',()=>{
  assert.equal(isValidPlanId('ultra'),true);
  assert.equal(isValidPlanId('enterprise'),false);
  assert.equal(decidePromptUsage({userId:'u1',planId:'pro',status:'expired',platform:'web',renewsAt:null,expiresAt:null,promptsUsedToday:0,dailyPromptLimit:null}).allowed,false);
});

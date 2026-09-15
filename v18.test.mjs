import test from 'node:test';
import assert from 'node:assert/strict';
import {constantTimeTokenEqual,isPrivateHostname,assertPublicHttpUrl} from '../dist/security/production.js';

test('v1.8 constant-time token comparator accepts only exact tokens',()=>{assert.equal(constantTimeTokenEqual('abc','abc'),true);assert.equal(constantTimeTokenEqual('abc','abd'),false);assert.equal(constantTimeTokenEqual('abc','abcd'),false)});
test('v1.8 SSRF guard blocks private destinations',()=>{for(const h of ['localhost','127.0.0.1','10.0.0.2','192.168.1.5','172.16.0.1','169.254.1.1'])assert.equal(isPrivateHostname(h),true);assert.throws(()=>assertPublicHttpUrl('http://127.0.0.1:8787/'),/private_network_url_blocked/);assert.throws(()=>assertPublicHttpUrl('http://user:pass@example.com/'),/url_credentials_forbidden/)});
test('v1.8 public URL guard accepts HTTPS public hosts',()=>{assert.equal(assertPublicHttpUrl('https://example.com/path').protocol,'https:')});

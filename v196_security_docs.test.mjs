import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('v1.9.6 security gate documents exist and contain critical controls', () => {
  const files = [
    'deploy/security/SECURITY_HARDENING_CHECKLIST.md',
    'deploy/security/production.env.example',
    'deploy/security/robots-policy.md'
  ];
  for (const file of files) assert.equal(existsSync(file), true, `${file} missing`);
  const checklist = readFileSync(files[0], 'utf8');
  assert.match(checklist, /MFA/i);
  assert.match(checklist, /SSRF/i);
  assert.match(checklist, /sandbox/i);
  assert.match(checklist, /billing/i);
  const env = readFileSync(files[1], 'utf8');
  assert.match(env, /JALALAI_REQUIRE_AUTH=true/);
  assert.match(env, /SESSION_SECRET=/);
});

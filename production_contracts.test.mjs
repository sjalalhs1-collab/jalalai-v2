import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('production contracts define central entitlement and task boundaries', async () => {
  const source = await readFile(new URL('../src/production/contracts.ts', import.meta.url), 'utf8');
  assert.match(source, /interface Entitlement/);
  assert.match(source, /interface TaskRecord/);
  assert.match(source, /interface ProductionAdapters/);
  assert.match(source, /google-play/);
});

test('Gate A documentation states external implementation boundaries honestly', async () => {
  const doc = await readFile(new URL('../docs/GATE_A_PRODUCTION_FOUNDATION.md', import.meta.url), 'utf8');
  assert.match(doc, /not.*claim/);
  assert.match(doc, /PostgreSQL/);
  assert.match(doc, /MFA/);
  assert.match(doc, /Idempotency/);
});

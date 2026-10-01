import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readOnlyFirestore } from '../dist-server/server/readOnlyFirestore.js';

test('Firestore reads pass through but writes never reach the SDK', async () => {
  let writes = 0;
  const doc = { get: async () => ({ data: () => ({ horses: 4 }) }), set: () => writes++, update: () => writes++, delete: () => writes++ };
  const db = readOnlyFirestore({ collection: () => ({ doc: () => doc, add: () => writes++ }), batch: () => writes++, runTransaction: () => writes++ });
  assert.equal((await db.collection('cards').doc('race').get()).data().horses, 4);
  for (const method of ['set', 'update', 'delete']) assert.throws(() => db.collection('cards').doc('race')[method]({}), /disabled/);
  assert.throws(() => db.collection('cards').add({}), /disabled/);
  assert.throws(() => db.batch(), /disabled/);
  assert.throws(() => db.runTransaction(() => {}), /disabled/);
  assert.equal(writes, 0);
});

test('no production AI provider, mutation routes, or analytics script', () => {
  const backend = readFileSync(new URL('../server/geminiProxy.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(backend, /openrouter\.ai|fetchPredictionFromMiniMax|fetchPredictionFromGeminiModel/);
  assert.doesNotMatch(backend, /url\.pathname === '\/api\/(admin|cron|debug|scheduler)\//);
  assert.match(backend, /const isLocalPredictionSandbox = \(\) => true/);
  assert.match(backend, /const firestoreWritesDisabled = \(\) => true/);
  assert.doesNotMatch(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), /src="\/analytics.js"/);
});

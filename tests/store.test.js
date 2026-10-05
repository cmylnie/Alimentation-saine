import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, normalize, parseBackup } from '../js/store.js';

test('un état incomplet est complété', () => {
  const s = normalize({ app: 'mon-assiette', version: 1, plan: [{ id: 'a' }], settings: { kcalTarget: 1600 } });
  assert.equal(s.settings.kcalTarget, 1600);
  assert.equal(s.settings.table, 1);
  assert.deepEqual(s.favorites, []);
  assert.equal(s.plan.length, 1);
});

test('restauration : refuse un fichier étranger ou plus récent', () => {
  assert.throws(() => parseBackup('pas du json'), /lisible/);
  assert.throws(() => parseBackup(JSON.stringify({ app: 'mes-enveloppes', version: 1 })), /Mon Assiette/);
  assert.throws(() => parseBackup(JSON.stringify({ app: 'mon-assiette', version: 99 })), /récente/);
  const ok = parseBackup(JSON.stringify({ ...emptyState(), favorites: ['dahl'] }));
  assert.deepEqual(ok.favorites, ['dahl']);
});

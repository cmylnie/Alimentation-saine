import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../js/model.js';
import * as A from '../js/actions.js';
import { emptyState } from '../js/store.js';

let n = 0;
const ids = () => 'x' + (++n);
const est = (s, t) => M.estimateDish(s, t);

test('plat écrit en toutes lettres : reconnu et estimé', () => {
  const s = emptyState();
  assert.equal(est(s, 'Poisson pané').kcal, 170 + 120);
  assert.equal(est(s, 'pâtes à la crème').kcal, 300 + 130);
  assert.equal(est(s, 'Gratin de chou-fleur').kcal, 250 + 90);
  assert.equal(est(s, 'tarte aux pommes').kcal, 330, 'une tarte aux pommes n\'est pas des pommes de terre');
  assert.equal(est(s, 'pommes de terre vapeur').kcal, 180);
  assert.equal(est(s, 'salade de fruits').kcal, 100);
  assert.equal(est(s, 'Café').kcal, 0);
  const u = est(s, 'Blanquette de la mer');
  assert.ok(u.approx && u.kcal === 350, 'plat inconnu : estimation moyenne signalée');
});

test('quantités dans le nom : nombre, part de pizza', () => {
  const s = emptyState();
  assert.equal(est(s, '2 oeufs durs').kcal, 180);
  assert.equal(est(s, 'une part de pizza').kcal, 300);
  assert.equal(est(s, 'pizza').kcal, 800);
  assert.equal(est(s, 'demi baguette').kcal, 40);
});

test('un repas = une liste de plats séparés par virgule, « et », « + »', () => {
  const s = emptyState();
  const meal = M.estimateMeal(s, 'colin sauce citron, riz et haricots verts + yaourt');
  assert.deepEqual(meal.map(d => d.label), ['Colin sauce citron', 'Riz', 'Haricots verts', 'Yaourt']);
  assert.deepEqual(meal.map(d => d.kcal), [170, 220, 80, 80]);
});

test('repas dehors : saisie par le nom, taille de portion, correction retenue', () => {
  const s = emptyState();
  const e = A.addExtEntry(s, { date: '2026-10-06', slot: 'dejeuner', place: 'cantine' }, ids);
  const items = A.addExtFromText(s, e.id, 'lasagnes aux légumes, salade verte, tarte aux pommes', ids);
  assert.equal(items.length, 3);
  assert.ok(!M.extToFill(e));
  A.setExtItemSize(s, e.id, items[2].id, 'petite');
  assert.equal(items[2].kcal, Math.round(330 * 0.75));
  A.setExtItemSize(s, e.id, items[2].id, 'normale');
  assert.equal(items[2].kcal, 330);
  A.setExtItemKcal(s, e.id, items[0].id, 480);
  assert.equal(items[0].kcal, 480);
  // la prochaine fois, « Lasagnes aux légumes » vaut 480
  const again = M.estimateDish(s, 'lasagnes aux LÉGUMES');
  assert.equal(again.kcal, 480);
  assert.ok(again.learned);
  // corrigé en grande portion : la valeur retenue est celle d'une portion normale
  A.setExtItemSize(s, e.id, items[1].id, 'grande');
  A.setExtItemKcal(s, e.id, items[1].id, 130);
  assert.equal(M.estimateDish(s, 'Salade verte').kcal, 100);
  assert.throws(() => A.addExtFromText(s, e.id, '  ', ids));
});

test('ingrédients écrits en toutes lettres : catalogue, quantités, inconnus estimés', () => {
  const s = emptyState();
  const lines = M.parseIngredients(s, 'laitue, chou rouge, 2 carottes râpées, 100 g de feta, 1 c. à s. d\'huile d\'olive, pommes de terre, topinambour');
  const by = Object.fromEntries(lines.map(l => [l.raw, l]));
  assert.equal(by['laitue'].ing.id, 'laitue');
  assert.equal(by['chou rouge'].ing.id, 'chou-rouge');
  assert.equal(by['2 carottes râpées'].ing.id, 'carotte');
  assert.equal(by['2 carottes râpées'].qty, 2);
  assert.equal(by['100 g de feta'].qty, 100);
  assert.equal(by["1 c. à s. d'huile d'olive"].ing.id, 'huile-olive');
  assert.equal(by["1 c. à s. d'huile d'olive"].qty, 1);
  assert.equal(by['pommes de terre'].ing.id, 'pomme-de-terre');
  assert.equal(by['pommes de terre'].qty, 200);
  assert.equal(by['topinambour'].guess.group, 'legume');
});

test('composer : liste écrite → repas complet, ingrédients inconnus créés une seule fois', () => {
  const s = emptyState();
  const draft = { ing: [], servings: 1 };
  A.addIngredientsFromText(s, draft, 'laitue, kumquat confit, maïs, vinaigrette');
  assert.equal(draft.ing.length, 4);
  assert.equal(s.customIngredients.length, 1);
  assert.ok(s.customIngredients[0].estimated);
  A.addIngredientsFromText(s, draft, 'kumquat confit');
  assert.equal(s.customIngredients.length, 1, 'pas de doublon');
  assert.ok(M.nutrition(s, draft).kcal > 0);
});

test('nouvel ingrédient : seul le nom est obligatoire', () => {
  const s = emptyState();
  const ing = A.addCustomIngredient(s, { name: 'Chou kale' });
  assert.equal(ing.group, 'legume');
  assert.equal(ing.kcal, 30);
  assert.ok(ing.estimated);
  const exact = A.addCustomIngredient(s, { name: 'Tomme de brebis', kcal: '380', p: '25' });
  assert.equal(exact.kcal, 380);
  assert.equal(exact.group, 'laitier');
  assert.ok(!exact.estimated);
  assert.throws(() => A.addCustomIngredient(s, { name: '  ' }));
});

test('desserts et en-cas reconnus', () => {
  const s = emptyState();
  const k = t => M.estimateDish(s, t);
  for (const t of ['yaourt', 'crème brûlée', 'muffin', 'biscuits', 'barre de céréales', 'smoothie', 'une poignée d\'amandes', '2 carrés de chocolat', 'île flottante'])
    assert.ok(!k(t).approx, `${t} non reconnu`);
  assert.equal(k('crème brûlée').kcal, 300);
  assert.equal(k('2 carrés de chocolat').kcal, 110);
});

test('saisie libre à la maison : rangée dans le repas, sans bloquer les propositions', () => {
  const s = emptyState();
  const a = A.addQuickText(s, { date: '2026-10-05', slot: 'diner', text: 'crème brûlée' }, ids);
  const b = A.addQuickText(s, { date: '2026-10-05', slot: 'diner', text: 'muffin' }, ids);
  assert.equal(a.entry.id, b.entry.id, 'un seul ajout par repas');
  assert.equal(a.entry.ext.items.length, 2);
  assert.equal(M.dayTotals(s, '2026-10-05').kcal, 300 + 330);
  assert.ok(!M.extToFill(a.entry), 'pas de bandeau « à renseigner »');
  A.applySuggestion(s, '2026-10-05', { slots: ['diner'] }, () => 0.3, ids);
  assert.ok(s.plan.some(e => e.date === '2026-10-05' && e.slot === 'diner' && e.recipeId), 'le dîner est quand même proposé');
  assert.throws(() => A.addQuickText(s, { date: '2026-10-06', slot: 'diner', text: ' ' }, ids));
  assert.ok(!s.plan.some(e => e.date === '2026-10-06' && e.ext), 'rien de créé si le texte est vide');
  for (const it of [...a.entry.ext.items]) A.removeExtItem(s, a.entry.id, it.id);
  assert.ok(!s.plan.some(e => e.id === a.entry.id), 'disparaît quand il est vide');
});

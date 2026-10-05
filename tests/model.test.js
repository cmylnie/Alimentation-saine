import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../js/model.js';
import * as A from '../js/actions.js';
import { emptyState } from '../js/store.js';
import { weekDays } from '../js/dates.js';

const MONDAY = '2026-10-05';
let n = 0;
const ids = () => 'e' + (++n);
function seeded(seed = 1) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

test('fractions lisibles', () => {
  assert.equal(M.fraction(0.5), '½');
  assert.equal(M.fraction(0.25), '¼');
  assert.equal(M.fraction(1.75), '1 ¾');
  assert.equal(M.fraction(0.33), '⅓');
  assert.equal(M.fraction(2), '2');
  assert.equal(M.fraction(0.98), '1');
  assert.equal(M.fraction(0.05), '¼');
});

test('lignes d\'ingrédients : unités, pluriel, poids cuit', () => {
  const s = emptyState();
  assert.deepEqual(M.formatLine(M.ingredient(s, 'oeuf'), 2), { qty: '2', name: 'Œufs', hint: '' });
  assert.equal(M.formatLine(M.ingredient(s, 'oeuf'), 1).name, 'Œuf');
  assert.equal(M.formatLine(M.ingredient(s, 'tofu'), 150).qty, '150 g');
  assert.equal(M.formatLine(M.ingredient(s, 'huile-olive'), 0.5).qty, '½ c. à s.');
  assert.equal(M.formatLine(M.ingredient(s, 'quinoa'), 50).hint, '≈ 150 g cuit');
});

test('nutrition par portion : la recette pour 4 est divisée par 4', () => {
  const s = emptyState();
  const r1 = { ing: [['oeuf', 2]], servings: 1 };
  const r4 = { ing: [['oeuf', 8]], servings: 4 };
  assert.equal(M.nutrition(s, r1).kcal, M.nutrition(s, r4).kcal);
  assert.equal(M.nutrition(s, r1).kcal, Math.round(2 * 55 / 100 * 140));
});

test('liste de courses : un ingrédient = une seule ligne, portions multipliées', () => {
  const s = emptyState();
  A.addEntry(s, { date: MONDAY, slot: 'diner', recipeId: 'tofu-cajou', portions: 2 }, ids);      // 300 g de tofu
  A.addEntry(s, { date: '2026-10-07', slot: 'dejeuner', recipeId: 'wrap-tofu', portions: 1 }, ids); // 100 g
  A.addEntry(s, { date: '2026-10-12', slot: 'dejeuner', recipeId: 'wrap-tofu', portions: 1 }, ids); // semaine suivante
  const items = M.shoppingList(s, MONDAY).flatMap(g => g.items);
  const tofu = items.filter(i => i.id === 'tofu');
  assert.equal(tofu.length, 1);
  assert.equal(tofu[0].qty, 400);
  assert.equal(tofu[0].buy, '400 g');
  assert.deepEqual(tofu[0].used.sort(), ['Tofu sauce cajou et brocoli', 'Wrap au tofu mariné et avocat']);
  // produits de placard rangés à part
  const curry = M.shoppingList(s, MONDAY).find(g => g.items.some(i => i.id === 'curry'));
  assert.equal(curry.aisle, 'placard');
});

test('liste de courses : pièces arrondies au-dessus, conserves en boîtes', () => {
  const s = emptyState();
  A.addEntry(s, { date: MONDAY, slot: 'dejeuner', recipeId: 'taboule-pois-chiches', portions: 3 }, ids);
  const items = M.shoppingList(s, MONDAY).flatMap(g => g.items);
  assert.equal(items.find(i => i.id === 'oignon-rouge').buy, '2');              // 1,5 → 2
  assert.equal(items.find(i => i.id === 'oignon-rouge').name, 'Oignons rouges');
  assert.equal(items.find(i => i.id === 'pois-chiches').buy, '2 × boîte de 400 g'); // 300 g égouttés
});

test('restes : comptés une seule fois dans les courses, mais dans la journée', () => {
  const s = emptyState();
  const e = A.addEntry(s, { date: MONDAY, slot: 'diner', recipeId: 'dahl', portions: 2, table: 1 }, ids);
  assert.equal(M.leftoverLeft(s, e), 1);
  A.addLeftover(s, e.id, { date: '2026-10-06', slot: 'dejeuner' }, ids);
  assert.equal(M.leftoverLeft(s, e), 0);
  assert.throws(() => A.addLeftover(s, e.id, { date: '2026-10-06', slot: 'diner' }, ids));
  const lent = M.shoppingList(s, MONDAY).flatMap(g => g.items).find(i => i.id === 'lentilles-corail');
  assert.equal(lent.qty, 140);
  const dahl = M.nutrition(s, M.recipe(s, 'dahl')).kcal;
  assert.equal(M.dayTotals(s, '2026-10-06').kcal, dahl);
  A.removeEntry(s, e.id);
  assert.equal(s.plan.length, 0, 'le reste disparaît avec le repas');
});

test('journée : total des calories et de ce qui est déjà mangé', () => {
  const s = emptyState();
  const a = A.addEntry(s, { date: MONDAY, slot: 'petitdej', recipeId: 'bowl-skyr' }, ids);
  A.addEntry(s, { date: MONDAY, slot: 'dejeuner', recipeId: 'shakshuka' }, ids);
  A.toggleDone(s, a.id);
  const t = M.dayTotals(s, MONDAY);
  const k = id => M.nutrition(s, M.recipe(s, id)).kcal;
  assert.equal(t.kcal, k('bowl-skyr') + k('shakshuka'));
  assert.equal(t.doneKcal, k('bowl-skyr'));
});

test('suggestion : semaine complète, sans doublon, protéines qui alternent', () => {
  const s = emptyState();
  const added = A.applySuggestion(s, MONDAY, {}, seeded(7), ids);
  assert.equal(added, 28);
  const meals = s.plan.filter(e => e.slot === 'dejeuner' || e.slot === 'diner');
  const recipeIds = meals.map(e => e.recipeId);
  assert.equal(new Set(recipeIds).size, recipeIds.length, 'une recette revient deux fois');
  const ordered = weekDays(MONDAY).flatMap(d => ['dejeuner', 'diner'].map(sl => s.plan.find(e => e.date === d && e.slot === sl)));
  const fams = ordered.map(e => M.mainFamily(s, M.recipe(s, e.recipeId)));
  for (let i = 1; i < fams.length; i++) assert.notEqual(fams[i], fams[i - 1], `même protéine deux repas de suite (${i})`);
  assert.ok(new Set(fams).size >= 4, 'au moins 4 familles de protéines dans la semaine');
});

test('suggestion : ne touche pas aux repas déjà prévus, respecte les recettes masquées', () => {
  const s = emptyState();
  A.addEntry(s, { date: MONDAY, slot: 'diner', recipeId: 'dahl' }, ids);
  s.hidden.push('shakshuka', 'chili-tempeh');
  A.applySuggestion(s, MONDAY, { slots: ['dejeuner', 'diner'] }, seeded(3), ids);
  assert.equal(s.plan.filter(e => e.date === MONDAY && e.slot === 'diner').length, 1);
  assert.equal(s.plan.length, 14);
  assert.ok(!s.plan.some(e => s.hidden.includes(e.recipeId)));
  assert.ok(!s.plan.some(e => e.slot === 'petitdej'));
});

test('suggestion « cuisiner le soir pour le lendemain midi »', () => {
  const s = emptyState();
  A.applySuggestion(s, MONDAY, { slots: ['dejeuner', 'diner'], batch: true }, seeded(11), ids);
  const tueLunch = s.plan.find(e => e.date === '2026-10-06' && e.slot === 'dejeuner');
  const monDinner = s.plan.find(e => e.date === MONDAY && e.slot === 'diner');
  assert.equal(tueLunch.leftoverOf, monDinner.id);
  assert.equal(tueLunch.recipeId, monDinner.recipeId);
  assert.equal(M.leftoverLeft(s, monDinner), 0);
});

test('suggestion : complète les journées trop légères sans dépasser l\'objectif', () => {
  const s = emptyState();
  A.applySuggestion(s, MONDAY, { target: 1800 }, seeded(5), ids);
  for (const d of weekDays(MONDAY)) {
    const k = M.dayTotals(s, d).kcal;
    assert.ok(k <= 1900 || !s.plan.some(e => e.date === d && M.recipe(s, e.recipeId).type === 'accomp'), `${d} : ${k} kcal`);
  }
  const avg = M.weekSummary(s, MONDAY).avg;
  assert.ok(avg >= 1550, `moyenne ${avg} kcal`);
  const sans = emptyState();
  A.applySuggestion(sans, MONDAY, {}, seeded(5), ids);
  assert.ok(!sans.plan.some(e => M.recipe(sans, e.recipeId).type === 'accomp'));
});

test('cantine : jours réservés, estimation puis plats réels, rien dans les courses', () => {
  const s = emptyState();
  A.applySuggestion(s, MONDAY, { slots: ['dejeuner', 'diner'], cantine: [0, 3] }, seeded(2), ids);
  const lunch = s.plan.find(e => e.date === MONDAY && e.slot === 'dejeuner');
  assert.equal(lunch.ext.place, 'cantine');
  assert.ok(s.plan.find(e => e.date === '2026-10-08' && e.slot === 'dejeuner').ext);
  assert.ok(!s.plan.find(e => e.date === '2026-10-06' && e.slot === 'dejeuner').ext);
  const dinner = M.entryNutrition(s, s.plan.find(e => e.date === MONDAY && e.slot === 'diner')).kcal;
  assert.equal(M.dayTotals(s, MONDAY).kcal, 650 + dinner);
  A.addExtItem(s, lunch.id, M.dishItem('poisson-grille'), ids);
  A.addExtItem(s, lunch.id, M.dishItem('feculent', 'grande'), ids);
  A.addExtItem(s, lunch.id, { label: 'Tarte maison', kcal: 320, photo: 'ph-1' }, ids);
  assert.equal(M.extNutrition(lunch).kcal, 160 + 286 + 320);
  assert.equal(M.dayTotals(s, MONDAY).kcal, 766 + dinner);
  assert.deepEqual(A.photosOf(lunch), ['ph-1']);
  assert.equal(A.removeExtItem(s, lunch.id, lunch.ext.items[2].id), 'ph-1');
  const all = M.shoppingList(s, MONDAY).flatMap(g => g.items);
  assert.ok(all.length > 0);
  assert.equal(M.leftoverLeft(s, lunch), 0);
});

test('restaurant : plusieurs plats, chacun avec sa photo', () => {
  const s = emptyState();
  const e = A.addExtEntry(s, { date: MONDAY, slot: 'diner', place: 'resto' }, ids);
  assert.equal(M.extNutrition(e).kcal, 0);
  A.addExtItem(s, e.id, { ...M.dishItem('salade-composee', 'petite'), photo: 'a' }, ids);
  A.addExtItem(s, e.id, { ...M.dishItem('saumon'), photo: 'b' }, ids);
  assert.equal(M.extNutrition(e).kcal, 240 + 320);
  assert.deepEqual(A.photosOf(e), ['a', 'b']);
  assert.throws(() => A.addExtItem(s, e.id, { label: '', kcal: 10 }, ids));
});

test('objectif de calories : activité réduite, plancher de sécurité', () => {
  const base = { sex: 'f', age: 35, height: 165, weight: 65 };
  const repos = M.estimateNeeds({ ...base, activity: 'repos' });
  const sport = M.estimateNeeds({ ...base, activity: 'modere' });
  assert.equal(repos.bmr, Math.round(650 + 1031.25 - 175 - 161));
  assert.ok(repos.maintain < sport.maintain, 'sans sport, il faut moins de calories');
  assert.equal(repos.target, repos.maintain);
  const perdre = M.estimateNeeds({ ...base, activity: 'repos', goal: 'perdre' });
  assert.ok(perdre.target < repos.target, 'perdre = moins que garder son poids');
  assert.ok(perdre.target >= repos.bmr, 'jamais sous le métabolisme de base');
  const petite = M.estimateNeeds({ sex: 'f', age: 60, height: 150, weight: 45, activity: 'repos', goal: 'perdre' });
  assert.ok(petite.target >= 1200 && petite.floored);
  assert.equal(M.estimateNeeds({ sex: 'f', age: 0, height: 165, weight: 65 }), null);
});

test('recherche : par ingrédient, sans accents', () => {
  const s = emptyState();
  const res = M.filterRecipes(s, { q: 'oeuf epinards' }).map(r => r.id);
  assert.ok(res.includes('omelette-epinards'));
  const fish = M.filterRecipes(s, { type: 'repas', fam: 'poisson' });
  assert.ok(fish.length >= 5 && fish.every(r => M.mainFamily(s, r) === 'poisson'));
});

test('composer : enregistrer un repas perso et l\'utiliser', () => {
  const s = emptyState();
  assert.throws(() => A.saveCustomRecipe(s, { name: '', ing: [['tofu', 100]] }));
  assert.throws(() => A.saveCustomRecipe(s, { name: 'Vide', ing: [] }));
  const r = A.saveCustomRecipe(s, { name: 'Mon bol', ing: [['tofu', 150], ['riz', 60], ['brocoli', 200]], steps: ['Cuire.', ' '] });
  assert.equal(M.recipe(s, r.id).name, 'Mon bol');
  assert.deepEqual(r.steps, ['Cuire.']);
  assert.equal(M.mainFamily(s, r), 'tofu');
  const again = A.saveCustomRecipe(s, { ...r, name: 'Mon bol du soir' });
  assert.equal(s.customRecipes.length, 1);
  assert.equal(again.id, r.id);
  A.addEntry(s, { date: MONDAY, slot: 'diner', recipeId: r.id }, ids);
  A.deleteCustomRecipe(s, r.id);
  assert.equal(s.plan.length, 0);
});

test('ingrédient perso : pas de doublon de nom, utilisable dans les calculs', () => {
  const s = emptyState();
  assert.throws(() => A.addCustomIngredient(s, { name: 'tofu FERME', kcal: 100 }), /existe déjà/);
  const ing = A.addCustomIngredient(s, { name: 'Seitan', kcal: 120, p: 25, c: 4, f: 2, unit: 'g', group: 'proteine', fam: 'tofu' });
  assert.equal(M.nutrition(s, { ing: [[ing.id, 200]] }).kcal, 240);
});

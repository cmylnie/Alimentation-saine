import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INGREDIENTS, AISLES, GROUPS, UNITS } from '../js/data/ingredients.js';
import { RECIPES } from '../js/data/recipes.js';
import * as M from '../js/model.js';
import { emptyState } from '../js/store.js';

const state = emptyState();

test('chaque ingrédient est unique, par identifiant et par nom', () => {
  const ids = INGREDIENTS.map(i => i.id);
  assert.equal(new Set(ids).size, ids.length);
  const names = INGREDIENTS.map(i => M.norm(i.name));
  assert.equal(new Set(names).size, names.length, 'deux ingrédients portent le même nom');
});

test('chaque ingrédient a un rayon, un groupe, une unité et des valeurs plausibles', () => {
  const aisles = new Set(AISLES.map(a => a.id)), groups = new Set(GROUPS.map(g => g.id));
  for (const i of INGREDIENTS) {
    assert.ok(aisles.has(i.aisle), i.id);
    assert.ok(groups.has(i.group), i.id);
    assert.ok(UNITS[i.unit], i.id);
    assert.ok(i.w > 0, i.id);
    assert.ok(i.kcal >= 0 && i.kcal <= 900, i.id);
    // 4 kcal/g de protéines et de glucides, 9 kcal/g de lipides : l'écart reste raisonnable
    // (sauf épices : riches en fibres, utilisées en quantités négligeables)
    if (i.aisle === 'epices') continue;
    const est = 4 * i.p + 4 * i.c + 9 * i.f;
    assert.ok(Math.abs(est - i.kcal) <= Math.max(60, i.kcal * 0.35), `${i.id} : ${i.kcal} kcal annoncées, ${Math.round(est)} calculées`);
  }
});

test('les recettes sont uniques et utilisent des ingrédients du catalogue', () => {
  const ids = RECIPES.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const r of RECIPES) {
    assert.ok(['petitdej', 'repas', 'gouter', 'accomp'].includes(r.type), r.id);
    assert.ok(r.ing.length, r.id);
    for (const [id, q] of r.ing) {
      assert.ok(M.ingredient(state, id), `${r.id} : ingrédient inconnu ${id}`);
      assert.ok(q > 0, `${r.id} : quantité nulle pour ${id}`);
    }
    const seen = r.ing.map(([id]) => id);
    assert.equal(new Set(seen).size, seen.length, `${r.id} : ingrédient en double`);
  }
});

test("aucune viande : ni dans les ingrédients, ni dans les recettes", () => {
  const meat = /poulet|boeuf|bœuf|porc|jambon|lardon|dinde|veau|agneau|canard|magret|saucisse|chorizo|bacon|viande|steak hach/i;
  for (const i of INGREDIENTS) assert.ok(!meat.test(i.name), i.name);
  for (const r of RECIPES) {
    assert.ok(!meat.test(r.name), r.name);
    for (const s of r.steps) assert.ok(!meat.test(s), `${r.id} : ${s}`);
  }
});

test('chaque repas a une protéine principale et un apport raisonnable', () => {
  for (const r of RECIPES.filter(x => x.type === 'repas')) {
    assert.ok(M.mainFamily(state, r), `${r.id} sans protéine`);
    const n = M.nutrition(state, r);
    assert.ok(n.kcal >= 250 && n.kcal <= 800, `${r.id} : ${n.kcal} kcal`);
    assert.ok(n.p >= 12, `${r.id} : ${n.p} g de protéines`);
  }
});

test('le menu est varié : assez de recettes par type et par famille de protéine', () => {
  const by = t => RECIPES.filter(r => r.type === t).length;
  assert.ok(by('repas') >= 40);
  assert.ok(by('petitdej') >= 8);
  assert.ok(by('gouter') >= 8);
  for (const f of M.FAMILIES) {
    const n = RECIPES.filter(r => r.type === 'repas' && M.mainFamily(state, r) === f.id).length;
    assert.ok(n >= 5, `${f.id} : seulement ${n} repas`);
  }
});

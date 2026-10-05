// Modifications de l'état. Chaque fonction modifie `state` en place.
import * as M from './model.js';
import { weekDays } from './dates.js';

const toggleIn = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); return i < 0; };

export function addEntry(state, { date, slot, recipeId, portions = 1, table = 1 }, newId = M.defaultId) {
  const e = { id: newId(), date, slot, recipeId, portions: Math.max(1, portions), table: Math.max(1, table) };
  state.plan.push(e);
  return e;
}

export function addLeftover(state, sourceId, { date, slot, table = 1 }, newId = M.defaultId) {
  const src = state.plan.find(e => e.id === sourceId);
  if (!src) throw new Error('Repas introuvable.');
  if (M.leftoverLeft(state, src) < table) throw new Error("Il n'en reste pas assez.");
  const e = { id: newId(), date, slot, recipeId: src.recipeId, portions: 0, table, leftoverOf: src.id };
  state.plan.push(e);
  return e;
}

// Supprime un repas ; ses restes prévus disparaissent avec lui.
export function removeEntry(state, id) {
  state.plan = state.plan.filter(e => e.id !== id && e.leftoverOf !== id);
}

export function updateEntry(state, id, patch) {
  const e = state.plan.find(x => x.id === id);
  if (!e) return;
  Object.assign(e, patch);
  if (!e.leftoverOf && !e.ext) e.portions = Math.max(e.table || 1, e.portions || 1);
}

export const toggleDone = (state, id) => { const e = state.plan.find(x => x.id === id); if (e) e.done = !e.done; };

export function clearWeek(state, monday) {
  const days = new Set(weekDays(monday));
  state.plan = state.plan.filter(e => !days.has(e.date));
  delete state.shopping[monday];
}

export function applySuggestion(state, monday, opts, rng, newId) {
  const added = M.suggestWeek(state, monday, opts, rng, newId);
  state.plan.push(...added);
  return added.length;
}

export const toggleFavorite = (state, id) => toggleIn(state.favorites, id);
export const toggleHidden = (state, id) => toggleIn(state.hidden, id);

export function saveCustomRecipe(state, r) {
  if (!r.name || !r.name.trim()) throw new Error('Donne un nom à ton repas.');
  const ing = (r.ing || []).filter(([id, q]) => M.ingredient(state, id) && q > 0);
  if (!ing.length) throw new Error('Ajoute au moins un ingrédient.');
  const rec = {
    id: r.id || 'u-' + M.defaultId(), name: r.name.trim(), emoji: r.emoji || '🍽️', type: r.type || 'repas',
    time: Number(r.time) || 0, servings: Math.max(1, Number(r.servings) || 1), ing,
    steps: (r.steps || []).map(s => s.trim()).filter(Boolean), tags: [], src: 'perso', custom: true,
  };
  const i = state.customRecipes.findIndex(x => x.id === rec.id);
  if (i >= 0) state.customRecipes[i] = rec; else state.customRecipes.push(rec);
  return rec;
}

export function deleteCustomRecipe(state, id) {
  state.customRecipes = state.customRecipes.filter(r => r.id !== id);
  state.plan = state.plan.filter(e => e.recipeId !== id);
  state.favorites = state.favorites.filter(x => x !== id);
}

export function addCustomIngredient(state, { name, aisle, group, unit, w, kcal, p, c, f, fam }) {
  if (!name || !name.trim()) throw new Error("Donne un nom à l'ingrédient.");
  if (!(kcal >= 0)) throw new Error('Indique les calories pour 100 g.');
  const key = M.norm(name.trim());
  if (M.allIngredients(state).some(i => M.norm(i.name) === key)) throw new Error('Cet ingrédient existe déjà.');
  const ing = {
    id: 'ui-' + M.defaultId(), name: name.trim(), aisle: aisle || 'epicerie', group: group || 'autre',
    unit: unit === 'pc' ? 'pc' : 'g', w: unit === 'pc' ? Math.max(1, Number(w) || 100) : 1,
    kcal: Number(kcal) || 0, p: Number(p) || 0, c: Number(c) || 0, f: Number(f) || 0, custom: true,
  };
  if (fam) ing.fam = fam;
  state.customIngredients.push(ing);
  return ing;
}

function shopOf(state, monday) {
  if (!state.shopping[monday]) state.shopping[monday] = { checked: [], extras: [] };
  return state.shopping[monday];
}
export const toggleShopItem = (state, monday, id) => toggleIn(shopOf(state, monday).checked, id);
export function addShopExtra(state, monday, text, newId = M.defaultId) {
  const t = String(text || '').trim();
  if (!t) return;
  shopOf(state, monday).extras.push({ id: newId(), text: t, done: false });
}
export function toggleShopExtra(state, monday, id) {
  const x = shopOf(state, monday).extras.find(e => e.id === id);
  if (x) x.done = !x.done;
}
export function removeShopExtra(state, monday, id) {
  const s = shopOf(state, monday);
  s.extras = s.extras.filter(e => e.id !== id);
}
export function uncheckAll(state, monday) {
  const s = shopOf(state, monday);
  s.checked = [];
  for (const x of s.extras) x.done = false;
}

/* ---------- Repas pris dehors ---------- */

export function addExtEntry(state, { date, slot, place }, newId = M.defaultId) {
  const e = { id: newId(), date, slot, ext: { place, photos: [], items: [] } };
  state.plan.push(e);
  return e;
}

const extOf = (state, id) => {
  const e = state.plan.find(x => x.id === id);
  if (!e || !e.ext) throw new Error('Repas introuvable.');
  return e.ext;
};

export function addExtItem(state, id, item, newId = M.defaultId) {
  const ext = extOf(state, id);
  if (!item.label || !(item.kcal >= 0)) throw new Error('Indique le plat et ses calories.');
  const it = { id: newId(), label: item.label, emoji: item.emoji || '🍽️', kcal: Math.round(item.kcal), p: Math.round(item.p || 0) };
  if (item.dishId) { it.dishId = item.dishId; it.size = item.size; }
  if (item.photo) it.photo = item.photo;
  ext.items.push(it);
  delete ext.estimate;
  return it;
}

// Renvoie l'identifiant de la photo liée, à effacer du téléphone.
export function removeExtItem(state, id, itemId) {
  const ext = extOf(state, id);
  const it = ext.items.find(i => i.id === itemId);
  ext.items = ext.items.filter(i => i.id !== itemId);
  return it && it.photo ? it.photo : null;
}

export const addExtPhoto = (state, id, photoId) => { extOf(state, id).photos.push(photoId); };
export function removeExtPhoto(state, id, photoId) {
  const ext = extOf(state, id);
  ext.photos = ext.photos.filter(p => p !== photoId);
}

// Toutes les photos rattachées à un repas (pour les effacer avec lui).
export const photosOf = e => (e && e.ext ? [...e.ext.photos, ...e.ext.items.map(i => i.photo).filter(Boolean)] : []);

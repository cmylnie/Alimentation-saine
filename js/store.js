// Persistance locale (localStorage) + sauvegarde/restauration en fichier JSON.
export const APP_ID = 'mon-assiette';
export const SCHEMA_VERSION = 1;
const KEY = 'mon-assiette:v1';

export function emptyState() {
  return {
    app: APP_ID,
    version: SCHEMA_VERSION,
    settings: { kcalTarget: 1800, table: 1, suggestSlots: ['petitdej', 'dejeuner', 'gouter', 'diner'], batch: false },
    favorites: [],
    hidden: [],
    customRecipes: [],
    customIngredients: [],
    plan: [],           // [{ id, date, slot, recipeId, portions, table, leftoverOf?, done? }]
    shopping: {},       // { lundi: { checked: [idIngrédient], extras: [{ id, text, done }] } }
    draft: null,        // repas en cours de composition
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : emptyState();
  } catch (e) {
    console.error('Lecture impossible', e);
    return emptyState();
  }
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
}

// Complète un état lu (ou importé) avec les champs apparus depuis.
export function normalize(s) {
  const base = emptyState();
  const out = { ...base, ...s, settings: { ...base.settings, ...(s.settings || {}) } };
  for (const k of Object.keys(base)) {
    if (Array.isArray(base[k]) && !Array.isArray(out[k])) out[k] = base[k];
  }
  if (!out.shopping || typeof out.shopping !== 'object') out.shopping = {};
  out.app = APP_ID;
  out.version = SCHEMA_VERSION;
  return out;
}

export function parseBackup(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { throw new Error("Ce fichier n'est pas une sauvegarde lisible."); }
  if (!obj || obj.app !== APP_ID) throw new Error("Ce fichier n'est pas une sauvegarde de Mon Assiette.");
  if (typeof obj.version !== 'number' || obj.version > SCHEMA_VERSION) throw new Error("Cette sauvegarde vient d'une version plus récente de l'appli.");
  return normalize(obj);
}

export async function requestPersistence() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) { /* non supporté */ }
  return false;
}

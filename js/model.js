// Calculs purs : nutrition, quantités, semaine, liste de courses, suggestions. Aucun accès au DOM.
import { INGREDIENTS, UNITS, AISLES } from './data/ingredients.js';
import { RECIPES } from './data/recipes.js';
import { DISHES, SIZES } from './data/dishes.js';
import { weekDays } from './dates.js';

export const SLOTS = [
  { id: 'petitdej', name: 'Petit-déjeuner', short: 'Petit-déj', types: ['petitdej'] },
  { id: 'dejeuner', name: 'Déjeuner', short: 'Déjeuner', types: ['repas'] },
  { id: 'gouter', name: 'Goûter', short: 'Goûter', types: ['gouter'] },
  { id: 'diner', name: 'Dîner', short: 'Dîner', types: ['repas'] },
];

export const TYPES = [
  { id: 'petitdej', name: 'Petits-déjeuners', one: 'Petit-déjeuner' },
  { id: 'repas', name: 'Repas', one: 'Repas' },
  { id: 'gouter', name: 'Goûters', one: 'Goûter' },
  { id: 'accomp', name: 'Accompagnements, desserts', one: 'Accompagnement' },
];

export const FAMILIES = [
  { id: 'oeufs', name: 'Œufs', icon: '🥚' },
  { id: 'tofu', name: 'Tofu, tempeh, soja', icon: '🌱' },
  { id: 'legumineuses', name: 'Légumineuses', icon: '🫘' },
  { id: 'poisson', name: 'Poisson', icon: '🐟' },
  { id: 'laitier', name: 'Fromage, laitages', icon: '🧀' },
];

/* ---------------- Catalogues (base + ce que l'utilisatrice a ajouté) ---------------- */

const baseIng = new Map(INGREDIENTS.map(i => [i.id, i]));
const baseRec = new Map(RECIPES.map(r => [r.id, r]));

export function ingredient(state, id) {
  return baseIng.get(id) || (state.customIngredients || []).find(i => i.id === id) || null;
}
export const allIngredients = state => [...INGREDIENTS, ...(state.customIngredients || [])];

export function recipe(state, id) {
  return (state.customRecipes || []).find(r => r.id === id) || baseRec.get(id) || null;
}
export const allRecipes = state => [...RECIPES, ...(state.customRecipes || [])];

/* ---------------- Nutrition ---------------- */

const grams = (ing, qty) => qty * (ing.w || 1);

// Valeurs pour une portion de la recette.
export function nutrition(state, r) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const [id, qty] of r.ing) {
    const ing = ingredient(state, id);
    if (!ing) continue;
    const k = grams(ing, qty) / 100;
    t.kcal += k * ing.kcal; t.p += k * ing.p; t.c += k * ing.c; t.f += k * ing.f;
  }
  const n = r.servings || 1;
  return { kcal: Math.round(t.kcal / n), p: Math.round(t.p / n), c: Math.round(t.c / n), f: Math.round(t.f / n) };
}

// Famille de la protéine principale (celle qui apporte le plus de protéines), pour varier les menus.
export function mainFamily(state, r) {
  const by = {};
  for (const [id, qty] of r.ing) {
    const ing = ingredient(state, id);
    if (!ing || !ing.fam) continue;
    by[ing.fam] = (by[ing.fam] || 0) + grams(ing, qty) * ing.p / 100;
  }
  let best = null;
  for (const [fam, v] of Object.entries(by)) if (!best || v > by[best]) best = fam;
  return best;
}

// Ingrédients pour n portions.
export const scaled = (r, portions) => r.ing.map(([id, qty]) => [id, qty * portions / (r.servings || 1)]);

/* ---------------- Affichage des quantités ---------------- */

const FRACTIONS = [[0, ''], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '']];

export function fraction(x) {
  if (x <= 0) return '0';
  let whole = Math.floor(x);
  const rest = x - whole;
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) if (Math.abs(rest - f[0]) < Math.abs(rest - best[0])) best = f;
  if (best[0] === 1) { whole += 1; best = FRACTIONS[0]; }
  if (whole === 0 && !best[1]) return '¼';           // une très petite quantité reste visible
  return whole ? `${whole}${best[1] ? ' ' + best[1] : ''}` : best[1];
}

const roundGrams = q => (q < 10 ? Math.max(1, Math.round(q)) : q < 100 ? Math.round(q / 5) * 5 : Math.round(q / 10) * 10);

// { qty: '150 g', name: 'Tofu ferme', hint: '≈ 150 g cuit' }
export function formatLine(ing, qty) {
  const u = UNITS[ing.unit] || UNITS.g;
  let q, name = ing.name;
  if (ing.unit === 'g' || ing.unit === 'ml') {
    q = `${roundGrams(qty)} ${u.label}`;
  } else {
    const fr = fraction(qty);
    const many = qty > 1.01;
    if (ing.unit === 'pc') { q = fr; if (many && ing.pl) name = ing.pl; }
    else q = `${fr} ${many && u.plural ? u.plural : u.label}`;
  }
  const hint = ing.cooked ? `≈ ${roundGrams(qty * ing.cooked)} g cuit` : '';
  return { qty: q, name, hint };
}

/* ---------------- Semaine ---------------- */

export const entriesOf = (state, date, slot) => state.plan.filter(e => e.date === date && (!slot || e.slot === slot));
export const weekEntries = (state, monday) => {
  const days = new Set(weekDays(monday));
  return state.plan.filter(e => days.has(e.date));
};

/* ---------------- Repas pris dehors (cantine, restaurant) ---------------- */

// Un repas dehors : { ext: { place: 'cantine' | 'resto', photos: [id], items: [{ id, label, emoji, kcal, p, photo? }], estimate? } }
// La photo sert d'aide-mémoire : les plats sont indiqués plus tard. En attendant, une estimation est
// comptée (650 kcal à la cantine, 900 au restaurant).
export const PLACES = {
  cantine: { name: 'Cantine', emoji: '🏢', estimate: 650 },
  resto: { name: 'Restaurant', emoji: '🍴', estimate: 900 },
};

export const dish = id => DISHES.find(d => d.id === id) || null;

export function dishItem(dishId, sizeId = 'normale') {
  const d = dish(dishId);
  const sz = SIZES.find(x => x.id === sizeId) || SIZES[1];
  return { dishId, size: sz.id, label: d.name + (sz.k !== 1 ? ` (${sz.name.toLowerCase()} portion)` : ''), emoji: d.emoji, kcal: Math.round(d.kcal * sz.k), p: Math.round(d.p * sz.k) };
}

// Repas photographié mais pas encore renseigné.
export const extToFill = e => !!(e.ext && !e.ext.items.length);

export function extNutrition(e) {
  const items = (e.ext && e.ext.items) || [];
  if (!items.length) {
    const est = e.ext.estimate ?? (PLACES[e.ext.place] || {}).estimate ?? 0;
    return { kcal: est, p: 0, c: 0, f: 0, estimated: est > 0 };
  }
  return { kcal: items.reduce((s, i) => s + (i.kcal || 0), 0), p: items.reduce((s, i) => s + (i.p || 0), 0), c: 0, f: 0, estimated: false };
}

// Ce que je mange, moi : une portion par repas prévu (les autres personnes à table ne comptent pas).
export function entryNutrition(state, e) {
  if (e.ext) return extNutrition(e);
  const r = recipe(state, e.recipeId);
  return r ? nutrition(state, r) : { kcal: 0, p: 0, c: 0, f: 0 };
}

export function dayTotals(state, date) {
  const t = { kcal: 0, p: 0, c: 0, f: 0, doneKcal: 0, count: 0 };
  for (const e of entriesOf(state, date)) {
    const n = entryNutrition(state, e);
    t.kcal += n.kcal; t.p += n.p; t.c += n.c; t.f += n.f; t.count++;
    if (e.done) t.doneKcal += n.kcal;
  }
  return t;
}

export const toFill = (state, monday) => weekEntries(state, monday).filter(extToFill)
  .sort((a, b) => a.date.localeCompare(b.date) || SLOTS.findIndex(s => s.id === a.slot) - SLOTS.findIndex(s => s.id === b.slot));

export function weekSummary(state, monday) {
  const days = weekDays(monday).map(d => ({ date: d, ...dayTotals(state, d) }));
  const planned = days.filter(d => d.count);
  const avg = planned.length ? Math.round(planned.reduce((s, d) => s + d.kcal, 0) / planned.length) : 0;
  const fams = {};
  for (const e of weekEntries(state, monday)) {
    const r = recipe(state, e.recipeId);
    if (!r || r.type !== 'repas') continue;
    const f = mainFamily(state, r);
    if (f) fams[f] = (fams[f] || 0) + 1;
  }
  return { days, avg, fams };
}

// Portions cuisinées qui restent pour un autre repas.
export function leftoverLeft(state, e) {
  if (e.leftoverOf || e.ext) return 0;
  const used = state.plan.filter(x => x.leftoverOf === e.id).reduce((s, x) => s + (x.table || 1), 0);
  return Math.max(0, (e.portions || 1) - (e.table || 1) - used);
}

/* ---------------- Liste de courses ---------------- */

function buyLabel(ing, qty) {
  if (ing.pack) {
    const n = Math.ceil(qty / ing.pack.size - 0.05);
    return `${Math.max(1, n)} × ${ing.pack.label}`;
  }
  if (ing.unit === 'pc') {
    const n = Math.ceil(qty - 0.01);
    return `${n}${ing.unit === 'pc' ? '' : ''}`;
  }
  if (ing.unit === 'g' || ing.unit === 'ml') {
    const step = qty < 100 ? 10 : qty < 1000 ? 50 : 100;
    const v = Math.ceil(qty / step) * step;
    return v >= 1000 ? `${String(v / 1000).replace('.', ',')} ${ing.unit === 'g' ? 'kg' : 'l'}` : `${v} ${ing.unit}`;
  }
  if (ing.unit === 'botte' || ing.unit === 'tranche') {
    const n = Math.ceil(qty - 0.01);
    const u = UNITS[ing.unit];
    return `${n} ${n > 1 ? u.plural : u.label}`;
  }
  return formatLine(ing, qty).qty;
}

export function shoppingList(state, monday) {
  const totals = new Map();
  const uses = new Map();
  for (const e of weekEntries(state, monday)) {
    if (e.leftoverOf || e.ext) continue;
    const r = recipe(state, e.recipeId);
    if (!r) continue;
    for (const [id, qty] of scaled(r, e.portions || 1)) {
      totals.set(id, (totals.get(id) || 0) + qty);
      if (!uses.has(id)) uses.set(id, new Set());
      uses.get(id).add(r.name);
    }
  }
  const items = [];
  for (const [id, qty] of totals) {
    const ing = ingredient(state, id);
    if (!ing) continue;
    let name = ing.name;
    if (ing.unit === 'pc' && Math.ceil(qty - 0.01) > 1 && ing.pl) name = ing.pl;
    items.push({ id, name, aisle: ing.pantry ? 'placard' : ing.aisle, qty, buy: buyLabel(ing, qty), used: [...uses.get(id)] });
  }
  const order = [...AISLES.map(a => a.id), 'placard'];
  items.sort((a, b) => order.indexOf(a.aisle) - order.indexOf(b.aisle) || a.name.localeCompare(b.name, 'fr'));
  const groups = [];
  for (const it of items) {
    let g = groups[groups.length - 1];
    if (!g || g.aisle !== it.aisle) groups.push(g = { aisle: it.aisle, items: [] });
    g.items.push(it);
  }
  return groups;
}

/* ---------------- Recherche ---------------- */

export const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae');

export function filterRecipes(state, { q = '', type = '', fam = '', quick = false, fav = false, hidden = false } = {}) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  return allRecipes(state).filter(r => {
    if (!hidden && state.hidden.includes(r.id)) return false;
    if (hidden && !state.hidden.includes(r.id)) return false;
    if (type && r.type !== type) return false;
    if (fav && !state.favorites.includes(r.id)) return false;
    if (quick && !(r.time <= 15)) return false;
    if (fam && mainFamily(state, r) !== fam) return false;
    if (words.length) {
      const hay = norm(r.name + ' ' + r.ing.map(([id]) => (ingredient(state, id) || {}).name).join(' '));
      if (!words.every(w => hay.includes(w))) return false;
    }
    return true;
  });
}

/* ---------------- Suggestion de semaine ---------------- */

// Remplit les cases vides de la semaine. Règles : pas deux fois la même recette dans la semaine (tant
// que c'est possible), pas la même famille de protéine que le repas précédent, favoris plus souvent.
// Avec batch : le dîner est cuisiné en double, le reste sert au déjeuner du lendemain.
// Avec target : une journée trop légère est complétée (fruit, laitage, pain), comme dans le livre.
const SIDE_FRUITS = ['pomme', 'kiwis', 'poire', 'orange', 'compote', 'banane', 'fraises'];
const SIDE_DAIRY = ['yaourt-nature', 'fromage-blanc-nature', 'petits-suisses'];

export function suggestWeek(state, monday, { slots = ['petitdej', 'dejeuner', 'gouter', 'diner'], batch = false, table = 1, target = 0, cantine = [] } = {}, rng = Math.random, newId = defaultId) {
  const added = [];
  const plan = () => [...state.plan, ...added];
  const used = new Set(weekEntries(state, monday).map(e => e.recipeId));
  const recent = [];
  let pendingLeftover = null;
  weekDays(monday).forEach((date, dayIndex) => {
    const before = added.length;
    for (const slot of SLOTS) {
      const existing = plan().filter(e => e.date === date && e.slot === slot.id);
      if (existing.length) {
        for (const e of existing) {
          const r = recipe(state, e.recipeId);
          if (r && r.type === 'repas') recent.push(mainFamily(state, r));
        }
        if (slot.id === 'dejeuner') pendingLeftover = null;
        continue;
      }
      if (slot.id === 'dejeuner' && cantine.includes(dayIndex)) {
        // le reste éventuel du dîner attend le prochain déjeuner à la maison
        added.push({ id: newId(), date, slot: 'dejeuner', ext: { place: 'cantine', photos: [], items: [], estimate: PLACES.cantine.estimate } });
        continue;
      }
      if (!slots.includes(slot.id)) continue;
      if (slot.id === 'dejeuner' && pendingLeftover) {
        added.push({ id: newId(), date, slot: 'dejeuner', recipeId: pendingLeftover.recipeId, portions: 0, table, leftoverOf: pendingLeftover.id });
        recent.push(mainFamily(state, recipe(state, pendingLeftover.recipeId)));
        pendingLeftover = null;
        continue;
      }
      const r = pick(state, slot, used, recent, rng);
      if (!r) continue;
      used.add(r.id);
      const isMeal = r.type === 'repas';
      const servings = r.servings || 1;
      let portions = Math.max(table, servings > 1 ? servings : table);
      if (batch && slot.id === 'diner') portions = Math.max(portions, table * 2);
      const e = { id: newId(), date, slot: slot.id, recipeId: r.id, portions, table };
      added.push(e);
      if (isMeal) recent.push(mainFamily(state, r));
      if (slot.id === 'diner' && portions - table >= table) pendingLeftover = e;
    }
    if (target && added.length > before) {
      const mine = added.slice(before);
      const filled = new Set(mine.filter(e => !e.ext).map(e => e.slot));
      let total = plan().filter(e => e.date === date).reduce((s, e) => s + entryNutrition(state, e).kcal, 0);
      const sides = [
        ['dejeuner', SIDE_FRUITS[dayIndex % SIDE_FRUITS.length]],
        ['diner', SIDE_DAIRY[dayIndex % SIDE_DAIRY.length]],
        ['dejeuner', 'pain-50'],
        ['diner', 'pain-25'],
        ['petitdej', SIDE_FRUITS[(dayIndex + 3) % SIDE_FRUITS.length]],
      ];
      for (const [sl, rid] of sides) {
        if (total >= target - 150) break;
        const r = recipe(state, rid);
        if (!r || !filled.has(sl) || state.hidden.includes(rid)) continue;
        const k = nutrition(state, r).kcal;
        if (total + k > target + 100) continue;
        added.push({ id: newId(), date, slot: sl, recipeId: rid, portions: table, table });
        total += k;
      }
    }
  });
  return added;
}

function pick(state, slot, used, recent, rng) {
  const pool = allRecipes(state).filter(r => slot.types.includes(r.type) && !state.hidden.includes(r.id));
  if (!pool.length) return null;
  const last = recent.slice(-1)[0], before = recent.slice(-2)[0];
  const tiers = [
    pool.filter(r => !used.has(r.id) && mainFamily(state, r) !== last && mainFamily(state, r) !== before),
    pool.filter(r => !used.has(r.id) && mainFamily(state, r) !== last),
    pool.filter(r => !used.has(r.id)),
    pool,
  ];
  const cands = slot.types.includes('repas') ? tiers.find(t => t.length) : (tiers[2].length ? tiers[2] : pool);
  const weights = cands.map(r => (state.favorites.includes(r.id) ? 3 : 1));
  let x = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < cands.length; i++) { x -= weights[i]; if (x < 0) return cands[i]; }
  return cands[cands.length - 1];
}

let counter = 0;
export function defaultId() {
  counter = (counter + 1) % 1e6;
  return Date.now().toString(36) + counter.toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ---------------- Besoins en calories ---------------- */

export const ACTIVITY = [
  { id: 'repos', name: 'Pas de sport en ce moment', k: 1.2 },
  { id: 'leger', name: 'Un peu active (marche)', k: 1.375 },
  { id: 'modere', name: 'Sport 2 à 3 fois / semaine', k: 1.55 },
  { id: 'sportive', name: 'Sport 4 fois / semaine ou +', k: 1.725 },
];

export const GOALS = [
  { id: 'maintenir', name: 'Garder mon poids', delta: 0 },
  { id: 'doucement', name: 'Perdre doucement (≈ 1 kg / mois)', delta: -300 },
  { id: 'perdre', name: 'Perdre un peu plus (≈ 2 kg / mois)', delta: -500 },
];

// Formule de Mifflin-St Jeor. Plancher de sécurité : 1 200 kcal (femme) / 1 500 kcal (homme),
// et jamais en dessous du métabolisme de base.
export function estimateNeeds({ sex = 'f', age, height, weight, activity = 'repos', goal = 'maintenir' }) {
  if (!(age > 0 && height > 0 && weight > 0)) return null;
  const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === 'h' ? 5 : -161);
  const act = (ACTIVITY.find(a => a.id === activity) || ACTIVITY[0]).k;
  const maintain = bmr * act;
  const g = GOALS.find(x => x.id === goal) || GOALS[0];
  const floor = Math.max(sex === 'h' ? 1500 : 1200, bmr);
  const raw = maintain + g.delta;
  const target = Math.round(Math.max(raw, floor) / 50) * 50;
  return { bmr: Math.round(bmr), maintain: Math.round(maintain / 50) * 50, target, floored: raw < floor, protein: Math.round(weight * 1) };
}

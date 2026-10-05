import * as M from './model.js';
import * as A from './actions.js';
import * as S from './store.js';
import { AISLES, GROUPS, UNITS } from './data/ingredients.js';
import { DISHES, DISH_CATS, SIZES } from './data/dishes.js';
import * as P from './photos.js';
import { todayISO, addDays, mondayOf, weekDays, labelDay, labelDayShort, labelWeek, JOURS_COURT } from './dates.js';

const APP_VERSION = '1.2.0';

let state = S.load();
let view = 'semaine';
let week = mondayOf(todayISO());
const recFilter = { q: '', type: 'repas', fam: '', quick: false, fav: false };
let installPrompt = null;

const $ = s => document.querySelector(s);
const T = () => todayISO();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kcal = n => `${Math.round(n).toLocaleString('fr-FR')} kcal`;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n, w, p = w + 's') => `${n} ${n > 1 ? p : w}`;
const num = v => { const n = Number(String(v ?? '').replace(',', '.').trim()); return Number.isFinite(n) ? n : NaN; };
const slotById = id => M.SLOTS.find(s => s.id === id);
const famById = id => M.FAMILIES.find(f => f.id === id);
const SRC = { programme: 'Programme', livre: 'Livre', perso: 'Perso' };

/* ================= Enregistrement, annulation ================= */

function commit() {
  if (!S.save(state)) toast('⚠️ Enregistrement impossible : la mémoire du navigateur est pleine ou bloquée.');
  render();
}

function withUndo(message, mutate) {
  const snapshot = JSON.stringify(state);
  mutate();
  commit();
  toast(message, () => { state = S.normalize(JSON.parse(snapshot)); commit(); });
}

let toastTimer = null;
function toast(message, undo) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(message)}</span>${undo ? '<button type="button">Annuler</button>' : ''}`;
  el.classList.remove('hide');
  if (undo) el.querySelector('button').onclick = () => { el.classList.add('hide'); undo(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hide'), undo ? 6000 : 3000);
}

/* ================= Feuilles modales ================= */
// Le bouton « retour » d'Android ferme la feuille au lieu de quitter l'appli.

let sheetOpen = false;
function openSheet(html, mount) {
  const sheet = $('#sheet');
  $('#toast').classList.add('hide');
  sheet.innerHTML = html;
  $('#overlay').classList.add('open');
  if (!sheetOpen) { history.pushState({ sheet: true }, ''); sheetOpen = true; }
  sheet.scrollTop = 0;
  if (mount) mount(sheet);
}
function hideSheet() {
  sheetOpen = false;
  $('#overlay').classList.remove('open');
  $('#sheet').innerHTML = '';
}
function closeSheet() {
  if (!sheetOpen) return;
  hideSheet();
  if (history.state && history.state.sheet) history.back();
}
window.addEventListener('popstate', () => { if (sheetOpen) hideSheet(); });
$('#overlay').addEventListener('click', e => { if (e.target.id === 'overlay') closeSheet(); });

const btnRow = (submit = 'Enregistrer', cancel = 'Annuler') =>
  `<p class="error"></p><div class="btn-row"><button type="button" class="btn btn-secondary" data-cancel>${cancel}</button><button class="btn btn-primary">${submit}</button></div>`;

function bindForm(root, onSubmit) {
  const form = root.querySelector('form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const err = form.querySelector('.error');
    if (err) err.textContent = '';
    try { onSubmit(form); } catch (ex) { if (err) err.textContent = ex.message; else toast(ex.message); }
  });
  const cancel = form.querySelector('[data-cancel]');
  if (cancel) cancel.onclick = () => closeSheet();
  return form;
}

/* ================= Rendu général ================= */

const TITLES = { semaine: 'Ma semaine', recettes: 'Recettes', composer: 'Composer un repas', courses: 'Courses', reglages: 'Réglages' };

function render() {
  $('#todayLabel').textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#pageTitle').textContent = TITLES[view];
  document.querySelectorAll('#tabbar .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === view));
  $('#fab').classList.toggle('hide', view !== 'semaine');
  const html = { semaine: viewSemaine, recettes: viewRecettes, composer: viewComposer, courses: viewCourses, reglages: viewReglages }[view]();
  $('#view').innerHTML = html;
  const mount = { recettes: mountRecettes, composer: mountComposer, courses: mountCourses, reglages: mountReglages }[view];
  if (mount) mount($('#view'));
  showPhotos($('#view'));
}

// Les photos sont lues dans la mémoire du téléphone après l'affichage.
function showPhotos(root) {
  root.querySelectorAll('img[data-photo]').forEach(async img => {
    const u = await P.photoURL(img.dataset.photo);
    if (u) img.src = u; else img.classList.add('missing');
  });
}

// Efface les photos d'un repas retiré, une fois passé le délai pour annuler.
function purgePhotosLater(ids) {
  if (!ids.length) return;
  setTimeout(() => {
    const still = new Set(state.plan.flatMap(A.photosOf));
    for (const id of ids) if (!still.has(id)) P.deletePhoto(id);
  }, 8000);
}

function go(v) {
  view = v;
  window.scrollTo(0, 0);
  render();
}

document.querySelectorAll('#tabbar .tab').forEach(b => { b.onclick = () => go(b.dataset.tab); });
$('#settingsBtn').onclick = () => go('reglages');

// Toutes les zones cliquables portent data-act="action" (et éventuellement data-id).
const ACTIONS = {};
function dispatch(ev) {
  const el = ev.target.closest('[data-act]');
  if (!el || !ACTIONS[el.dataset.act]) return;
  ev.preventDefault();
  ev.stopPropagation();
  ACTIONS[el.dataset.act](el.dataset.id, el);
}
$('#view').addEventListener('click', dispatch);
$('#sheet').addEventListener('click', dispatch);

const pager = (label, sub, act) => `
  <div class="pager">
    <button data-act="${act}" data-id="-1" aria-label="Semaine précédente">‹</button>
    <div class="lab"><b>${label}</b><span>${sub}</span></div>
    <button data-act="${act}" data-id="1" aria-label="Semaine suivante">›</button>
  </div>`;

function weekLabel(monday) {
  const cur = mondayOf(T());
  if (monday === cur) return 'Cette semaine';
  if (monday === addDays(cur, 7)) return 'La semaine prochaine';
  if (monday === addDays(cur, -7)) return 'La semaine dernière';
  return 'Semaine';
}
ACTIONS.goreglages = () => go('reglages');
ACTIONS.week = d => { week = addDays(week, 7 * Number(d)); render(); };

/* ================= Semaine ================= */

function viewSemaine() {
  const sum = M.weekSummary(state, week);
  const target = state.settings.kcalTarget;
  const entries = M.weekEntries(state, week);
  let h = pager(weekLabel(week), labelWeek(week), 'week');
  h += `<div class="lead-actions">
    <button class="btn btn-primary" data-act="suggest">✨ ${entries.length ? 'Compléter la semaine' : 'Me proposer des menus'}</button>
    ${entries.length ? '<button class="btn btn-secondary" style="flex:0 0 auto;width:auto;padding:11px 14px" data-act="clearweek" aria-label="Vider la semaine">Vider</button>' : ''}
  </div>`;
  const pending = M.toFill(state, week).filter(e => e.ext.photos.length || e.date < T());
  if (pending.length) {
    h += `<div class="banner warn"><span>📷 ${plural(pending.length, 'repas', 'repas')} pris dehors ${pending.length > 1 ? 'sont' : 'est'} à renseigner. La photo t'aide à te souvenir de ce que tu as mangé.</span><button class="btn btn-primary" data-act="entry" data-id="${pending[0].id}">Renseigner</button></div>`;
  }
  if (entries.length) {
    const cooked = entries.filter(e => !e.leftoverOf && !e.ext && (M.recipe(state, e.recipeId) || {}).type !== 'accomp').length;
    h += `<div class="kpis">
      <div class="kpi"><b>${sum.avg ? sum.avg.toLocaleString('fr-FR') : '–'}</b><span>kcal / jour en moyenne</span></div>
      <div class="kpi"><b>${target ? target.toLocaleString('fr-FR') : '–'}</b><span>objectif / jour</span></div>
      <div class="kpi"><b>${cooked}</b><span>repas à préparer</span></div>
    </div>`;
    const fams = Object.entries(sum.fams).sort((a, b) => b[1] - a[1]);
    if (fams.length) h += `<div class="fam-row">Protéines des repas : ${fams.map(([f, n]) => `<span class="badge">${famById(f).icon} ${esc(famById(f).name)} × ${n}</span>`).join('')}</div>`;
  } else {
    if (!state.settings.profile) h += `<div class="banner warn"><span>Ton objectif est réglé par défaut sur ${(state.settings.kcalTarget || 0).toLocaleString('fr-FR')} kcal par jour. Calcule-le selon ton âge, ta taille, ton poids et ton activité.</span><button class="btn btn-primary" data-act="goreglages">Calculer</button></div>`;
    h += `<div class="banner info"><span>Ta semaine est vide. Touche <b>Me proposer des menus</b> pour la remplir d'un coup, ou ajoute tes repas un par un avec les boutons <b>+</b>. Tu pourras tout changer ensuite.</span></div>`;
  }
  for (const d of sum.days) h += dayCard(d, target);
  return h + '<div style="height:16px"></div>';
}

function dayCard(d, target) {
  const today = d.date === T();
  const pct = target ? Math.min(100, Math.round(d.kcal / target * 100)) : 0;
  const over = target && d.kcal > target * 1.1;
  let h = `<div class="card day ${today ? 'today' : ''}" id="d-${d.date}">
    <div class="day-top"><h3>${today ? "Aujourd'hui · " + labelDay(d.date) : cap(labelDay(d.date))}</h3>
      <span class="k">${d.count ? `${kcal(d.kcal)}${target ? ` / ${target.toLocaleString('fr-FR')}` : ''}` : ''}</span></div>`;
  if (d.count && target) h += `<div class="track"><div class="fill ${over ? 'low' : pct < 70 ? 'mid' : ''}" style="width:${pct}%"></div></div>`;
  for (const slot of M.SLOTS) {
    const list = M.entriesOf(state, d.date, slot.id);
    h += `<div class="slot"><div class="slot-head"><span class="label">${slot.name}</span>
      <button class="slot-add" data-act="addto" data-id="${d.date}|${slot.id}" aria-label="Ajouter au ${esc(slot.name)}">+</button></div>`;
    for (const e of list) h += mealRow(e);
    h += '</div>';
  }
  return h + '</div>';
}

function extRow(e) {
  const pl = M.PLACES[e.ext.place];
  const n = M.extNutrition(e);
  const photos = A.photosOf(e);
  const sub = e.ext.items.length ? e.ext.items.map(i => i.label).join(', ') : photos.length ? '✎ À renseigner (estimation en attendant)' : '📷 Prends ton repas en photo pour t\'en souvenir';
  return `<div class="meal ${e.done ? 'done' : ''}" data-act="entry" data-id="${e.id}">
    <button class="tick ${e.done ? 'on' : ''}" data-act="done" data-id="${e.id}" aria-label="${e.done ? 'Pas encore mangé' : "C'est mangé"}">✓</button>
    ${photos.length ? `<img class="thumb" data-photo="${photos[0]}" alt="">` : `<span class="em">${pl.emoji}</span>`}
    <div class="main"><p class="t">${esc(pl.name)}</p><p class="s">${esc(sub)}</p></div>
    <span class="kc">${n.estimated ? '≈ ' : ''}${n.kcal}</span>
  </div>`;
}

function mealRow(e) {
  if (e.ext) return extRow(e);
  const r = M.recipe(state, e.recipeId);
  if (!r) return '';
  const n = M.nutrition(state, r);
  let sub = '';
  if (e.leftoverOf) sub = '♻️ Reste déjà cuisiné';
  else {
    const parts = [];
    if (r.type !== 'accomp' && (e.portions || 1) > 1) parts.push(`${plural(e.portions, 'portion')} à cuisiner`);
    const left = M.leftoverLeft(state, e);
    if (left > 0) parts.push(`<b style="color:var(--gold)">${plural(left, 'reste')} à placer</b>`);
    sub = parts.join(' · ');
  }
  return `<div class="meal ${e.done ? 'done' : ''}" data-act="entry" data-id="${e.id}">
    <button class="tick ${e.done ? 'on' : ''}" data-act="done" data-id="${e.id}" aria-label="${e.done ? 'Pas encore mangé' : "C'est mangé"}">✓</button>
    <span class="em">${r.emoji}</span>
    <div class="main"><p class="t">${esc(r.name)}</p>${sub ? `<p class="s">${sub}</p>` : ''}</div>
    <span class="kc">${n.kcal}</span>
  </div>`;
}

ACTIONS.done = (id, el) => { A.toggleDone(state, id); if (el && el.closest('#sheet')) closeSheet(); commit(); };

ACTIONS.clearweek = () => {
  const photos = M.weekEntries(state, week).flatMap(A.photosOf);
  withUndo('Semaine vidée.', () => A.clearWeek(state, week));
  purgePhotosLater(photos);
};

ACTIONS.suggest = () => {
  const s = state.settings;
  openSheet(`<form>
    <h2>Me proposer des menus</h2>
    <p class="intro">Je remplis seulement les cases vides de la semaine, en variant les recettes et les protéines. Tes favoris reviennent plus souvent ; les recettes masquées ne sont jamais proposées.</p>
    <p class="label">Repas à remplir</p>
    <div style="margin-bottom:6px">${M.SLOTS.map(sl => `<label class="check"><input type="checkbox" name="slot" value="${sl.id}" ${s.suggestSlots.includes(sl.id) ? 'checked' : ''}> ${sl.name}</label>`).join('')}</div>
    <label class="check"><input type="checkbox" name="batch" ${s.batch ? 'checked' : ''}> <span>Cuisiner le soir pour le midi du lendemain<br><small class="muted">Le dîner est préparé en double, le reste devient le déjeuner du jour suivant.</small></span></label>
    <p class="label" style="margin-top:6px">Déjeuner à la cantine</p>
    <div class="day-chips" style="margin-bottom:6px">${JOURS_COURT.map((j, i) => `<button type="button" class="chip ${s.cantineDays.includes(i) ? 'on' : ''}" data-cday="${i}">${j}</button>`).join('')}</div>
    <p class="small muted" style="margin:0 0 14px">Ces jours-là, le déjeuner est laissé pour la cantine (compté ≈ ${M.PLACES.cantine.estimate} kcal jusqu'à ta photo).</p>
    ${s.kcalTarget ? `<label class="check"><input type="checkbox" name="fill" checked> <span>Compléter les journées trop légères<br><small class="muted">Un fruit, un laitage ou du pain pour approcher ${s.kcalTarget.toLocaleString('fr-FR')} kcal par jour.</small></span></label>` : '<input type="checkbox" name="fill" class="hide">'}
    ${btnRow('Proposer')}
  </form>`, root => {
    root.querySelectorAll('[data-cday]').forEach(b => { b.onclick = () => b.classList.toggle('on'); });
    bindForm(root, form => {
    const slots = [...form.querySelectorAll('[name=slot]:checked')].map(i => i.value);
    const cantine = [...form.querySelectorAll('[data-cday].on')].map(b => Number(b.dataset.cday));
    if (!slots.length) throw new Error('Choisis au moins un repas.');
    const batch = form.elements.batch.checked;
    Object.assign(state.settings, { suggestSlots: slots, batch, cantineDays: cantine });
    const n = A.applySuggestion(state, week, { slots, batch, cantine, table: state.settings.table, target: form.elements.fill.checked ? state.settings.kcalTarget : 0 });
    closeSheet();
    commit();
    toast(n ? `${plural(n, 'repas ajouté', 'repas ajoutés')}. Touche un repas pour le changer.` : 'Toutes les cases choisies sont déjà remplies.');
    });
  });
};

ACTIONS.addto = id => {
  const [date, slot] = id.split('|');
  pickRecipe({ date, slot });
};

// Choix d'une recette pour une case (ou pour remplacer un repas).
function pickRecipe({ date, slot, replace }) {
  const sl = slotById(slot);
  let tab = sl.types[0];
  let q = '';
  const draw = root => {
    const list = M.filterRecipes(state, { q, type: tab === 'tout' ? '' : tab === 'fav' ? '' : tab, fav: tab === 'fav' })
      .sort((a, b) => (state.favorites.includes(b.id) - state.favorites.includes(a.id)) || a.name.localeCompare(b.name, 'fr'));
    root.querySelector('.pick-list').innerHTML = list.length
      ? list.map(r => recRow(r, 'pickrec')).join('')
      : '<p class="empty">Aucune recette ne correspond.</p>';
    root.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  };
  const tabs = [[sl.types[0], M.TYPES.find(t => t.id === sl.types[0]).name], ['accomp', 'Accompagnements'], ['fav', '♥ Favoris'], ['tout', 'Tout']];
  openSheet(`<h2>${replace ? 'Remplacer' : 'Ajouter'} · ${esc(sl.name)}</h2>
    <p class="intro">${esc(labelDay(date))}. Tu peux mettre plusieurs choses dans le même repas (un plat, du pain, un fruit…).</p>
    ${replace ? '' : `<div class="btn-row" style="margin:0 0 12px"><button class="btn btn-secondary" data-act="eatout" data-id="${date}|${slot}|cantine">🏢 Cantine</button><button class="btn btn-secondary" data-act="eatout" data-id="${date}|${slot}|resto">🍴 Restaurant</button></div>`}
    <div class="search" style="padding:0"><input type="search" placeholder="Chercher (tofu, saumon, lentilles…)" autocomplete="off"></div>
    <div class="chips" style="padding:10px 0 4px">${tabs.map(([id, n]) => `<button class="chip" data-tab="${id}">${n}</button>`).join('')}</div>
    <div class="pick-list"></div>`, root => {
    root.querySelector('input').oninput = e => { q = e.target.value; draw(root); };
    root.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { tab = b.dataset.tab; draw(root); }; });
    draw(root);
  });
  ACTIONS.pickrec = rid => {
    const r = M.recipe(state, rid);
    if (replace) {
      const e = state.plan.find(x => x.id === replace);
      A.updateEntry(state, replace, { recipeId: rid, portions: defaultPortions(r) });
      state.plan = state.plan.filter(x => x.leftoverOf !== e.id);
      closeSheet(); commit(); toast('Repas remplacé.');
    } else {
      A.addEntry(state, { date, slot, recipeId: rid, portions: defaultPortions(r), table: state.settings.table });
      closeSheet(); commit(); toast(`${r.name} ajouté.`);
    }
  };
}

const defaultPortions = r => Math.max(state.settings.table, r.type !== 'accomp' && (r.servings || 1) > 1 ? r.servings : state.settings.table);

// Fiche d'un repas prévu.
ACTIONS.entry = id => {
  const e = state.plan.find(x => x.id === id);
  if (!e) return;
  if (e.ext) { extSheet(id); return; }
  const r = M.recipe(state, e.recipeId);
  const n = M.nutrition(state, r);
  const src = e.leftoverOf ? state.plan.find(x => x.id === e.leftoverOf) : null;
  const left = M.leftoverLeft(state, e);
  let h = `<div class="r-head"><span class="em">${r.emoji}</span><div><h2>${esc(r.name)}</h2>
    <p class="s">${esc(slotById(e.slot).name)} · ${esc(labelDay(e.date))} · ${n.kcal} kcal la portion</p></div></div>`;
  if (src) {
    h += `<div class="banner info" style="margin:0 0 12px"><span>♻️ C'est le reste du repas du ${esc(labelDay(src.date))} (${esc(slotById(src.slot).name.toLowerCase())}) : rien à cuisiner ni à acheter.</span></div>`;
  } else if (r.type !== 'accomp') {
    h += `<div class="stepper-row"><span class="lbl">Portions à cuisiner<small>Pour la liste de courses</small></span>
      <div class="stepper"><button data-act="eportions" data-id="${e.id}|-1">−</button><b>${e.portions}</b><button data-act="eportions" data-id="${e.id}|1">+</button></div></div>
      <div class="stepper-row"><span class="lbl">Personnes à table<small>Toi comprise</small></span>
      <div class="stepper"><button data-act="etable" data-id="${e.id}|-1">−</button><b>${e.table || 1}</b><button data-act="etable" data-id="${e.id}|1">+</button></div></div>`;
    if (left > 0) h += `<div class="banner warn" style="margin:0 0 12px"><span>Il reste ${plural(left, 'portion')}. Prévois quand tu les mangeras.</span><button class="btn btn-primary" data-act="leftover" data-id="${e.id}">Placer</button></div>`;
  }
  h += `<div class="actions-grid">
    <button class="btn btn-primary wide" data-act="done" data-id="${e.id}">${e.done ? 'Finalement, pas encore mangé' : "✓ C'est mangé"}</button>
    <button class="btn btn-secondary" data-act="recipe" data-id="${r.id}">Voir la recette</button>
    <button class="btn btn-secondary" data-act="replace" data-id="${e.id}">Remplacer</button>
    <button class="btn btn-secondary" data-act="move" data-id="${e.id}">Déplacer</button>
    <button class="btn btn-danger" data-act="delentry" data-id="${e.id}">Retirer</button>
  </div>`;
  openSheet(h);
};
const reopenEntry = id => { commit(); ACTIONS.entry(id); };
ACTIONS.eportions = v => {
  const [id, d] = v.split('|');
  const e = state.plan.find(x => x.id === id);
  const used = state.plan.filter(x => x.leftoverOf === id).reduce((s, x) => s + (x.table || 1), 0);
  e.portions = Math.max((e.table || 1) + used, e.portions + Number(d));
  reopenEntry(id);
};
ACTIONS.etable = v => {
  const [id, d] = v.split('|');
  const e = state.plan.find(x => x.id === id);
  e.table = Math.max(1, (e.table || 1) + Number(d));
  const used = state.plan.filter(x => x.leftoverOf === id).reduce((s, x) => s + (x.table || 1), 0);
  e.portions = Math.max(e.portions, e.table + used);
  reopenEntry(id);
};
ACTIONS.replace = id => { const e = state.plan.find(x => x.id === id); pickRecipe({ date: e.date, slot: e.slot, replace: id }); };
ACTIONS.delentry = id => {
  closeSheet();
  const e = state.plan.find(x => x.id === id);
  const name = e.ext ? M.PLACES[e.ext.place].name : M.recipe(state, e.recipeId).name;
  const photos = A.photosOf(e);
  withUndo(`${name} retiré.`, () => A.removeEntry(state, id));
  purgePhotosLater(photos);
};

/* ---------- Repas à la cantine ou au restaurant ---------- */

ACTIONS.eatout = v => {
  const [date, slot, place] = v.split('|');
  const e = A.addExtEntry(state, { date, slot, place });
  commit();
  extSheet(e.id);
};

const photoInput = (act, id, label, primary = false) =>
  `<label class="btn ${primary ? 'btn-primary' : 'btn-secondary'}">${label}<input type="file" accept="image/*" class="hide" data-photo-act="${act}" data-id="${id}"></label>`;

function bindPhotoInputs(root) {
  root.querySelectorAll('input[data-photo-act]').forEach(inp => {
    inp.onchange = async () => {
      const file = inp.files[0];
      if (!file) return;
      const pid = 'ph-' + M.defaultId();
      try { await P.savePhoto(file, pid); } catch (ex) { toast("Photo non enregistrée : la mémoire du téléphone est peut-être pleine."); return; }
      PHOTO_ACTIONS[inp.dataset.photoAct](inp.dataset.id, pid);
    };
  });
}
// La photo sert d'aide-mémoire : on la garde, les plats seront indiqués plus tard.
const PHOTO_ACTIONS = {
  photo: (id, pid) => { A.addExtPhoto(state, id, pid); commit(); extSheet(id); toast('Photo gardée. Tu indiqueras les plats quand tu veux.'); },
};

function extSheet(id) {
  const e = state.plan.find(x => x.id === id);
  if (!e) return;
  const pl = M.PLACES[e.ext.place];
  const n = M.extNutrition(e);
  const cantine = e.ext.place === 'cantine';
  let h = `<div class="r-head"><span class="em">${pl.emoji}</span><div><h2>${pl.name}</h2>
    <p class="s">${esc(slotById(e.slot).name)} · ${esc(labelDay(e.date))}</p></div></div>
    <div class="macros" style="grid-template-columns:1fr 1fr"><div><b>${n.estimated ? '≈ ' : ''}${n.kcal}</b><span>kcal</span></div><div><b>${n.estimated ? '–' : n.p + ' g'}</b><span>Prot.</span></div></div>`;
  if (n.estimated) h += `<p class="small muted" style="margin:-6px 0 12px">${e.ext.photos.length ? 'Estimation en attendant que tu indiques ce que tu as mangé.' : `Estimation en attendant. Prends ${cantine ? 'ton plateau' : 'tes plats'} en photo pour t'en souvenir, et indique ce que tu as mangé quand tu as le temps.`}</p>`;
  if (e.ext.photos.length) {
    h += `<div class="photos">${e.ext.photos.map(p => `<div class="ph"><img data-photo="${p}" alt="Photo du repas" data-act="viewphoto" data-id="${p}"><button class="x" data-act="delphoto" data-id="${id}|${p}" aria-label="Supprimer la photo">×</button></div>`).join('')}</div>`;
  }
  h += `<h3>${cantine ? 'Sur mon plateau' : 'Plats commandés'}</h3>
    <div class="card" style="padding:0 12px;margin-bottom:10px">${e.ext.items.length ? e.ext.items.map(it => `<div class="comp-line">
      ${it.photo ? `<img class="thumb" data-photo="${it.photo}" data-act="viewphoto" data-id="${it.photo}" alt="">` : `<span style="font-size:20px;width:26px;text-align:center">${it.emoji}</span>`}
      <div class="n">${esc(it.label)}<small>${it.kcal} kcal${it.p ? ` · ${it.p} g de protéines` : ''}</small></div>
      <button class="x" data-act="delitem" data-id="${id}|${it.id}" aria-label="Retirer">×</button></div>`).join('') : '<p class="empty">Rien pour l\'instant.</p>'}</div>
    <div class="stack">
      ${e.ext.photos.length || e.ext.items.length
        ? `<button class="btn btn-primary" data-act="adddish" data-id="${id}">+ Indiquer ${cantine ? 'ce qu\'il y avait sur le plateau' : 'un plat'}</button>${photoInput('photo', id, cantine ? '📷 Autre photo' : '📷 Photo d\'un autre plat')}`
        : `${photoInput('photo', id, cantine ? '📷 Photo du plateau' : '📷 Photo d\'un plat', true)}<button class="btn btn-secondary" data-act="adddish" data-id="${id}">+ Indiquer ce que j'ai mangé</button>`}
    </div>
    <div class="actions-grid" style="margin-top:14px">
      <button class="btn btn-primary wide" data-act="done" data-id="${id}">${e.done ? 'Finalement, pas encore mangé' : "✓ C'est mangé"}</button>
      <button class="btn btn-secondary" data-act="move" data-id="${id}">Déplacer</button>
      <button class="btn btn-danger" data-act="delentry" data-id="${id}">Retirer</button>
    </div>`;
  openSheet(h, root => { bindPhotoInputs(root); showPhotos(root); });
}

ACTIONS.adddish = id => dishPicker(id);
// Photo en grand pendant qu'on renseigne le repas.
ACTIONS.zoomphoto = v => {
  const [id, pid] = v.split('|');
  openSheet(`<img class="photo-full" data-photo="${pid}" alt="Photo du repas"><button class="btn btn-primary" style="margin-top:12px" data-act="unzoom" data-id="${id}">Retour</button>`, root => showPhotos(root));
};
ACTIONS.unzoom = id => dishPicker(id);
ACTIONS.delitem = v => {
  const [id, itemId] = v.split('|');
  const pid = A.removeExtItem(state, id, itemId);
  commit(); extSheet(id);
  if (pid) purgePhotosLater([pid]);
};
ACTIONS.delphoto = v => {
  const [id, pid] = v.split('|');
  A.removeExtPhoto(state, id, pid);
  commit(); extSheet(id);
  purgePhotosLater([pid]);
};
ACTIONS.viewphoto = pid => {
  const back = sheetReturn;
  openSheet(`<img class="photo-full" data-photo="${pid}" alt="Photo du repas"><button class="btn btn-secondary" style="margin-top:12px" data-act="photoback">Retour</button>`, root => showPhotos(root));
  ACTIONS.photoback = () => (back ? back() : closeSheet());
};
let sheetReturn = null;

// Choix d'un plat courant (cantine, restaurant) avec la taille de la portion.
function dishPicker(id) {
  let cat = 'plat';
  let q = '';
  sheetReturn = () => extSheet(id);
  const draw = root => {
    const words = M.norm(q).split(/\s+/).filter(Boolean);
    const list = DISHES.filter(d => (words.length ? words.every(w => M.norm(d.name).includes(w)) : d.cat === cat));
    root.querySelector('.pick-list').innerHTML = list.map(d => `<div class="pick" data-act="pickdish" data-id="${d.id}">${d.emoji} ${esc(d.name)}<span>${d.kcal} kcal</span></div>`).join('')
      || '<p class="empty">Introuvable : utilise « Autre plat » ci-dessous.</p>';
    root.querySelectorAll('[data-dcat]').forEach(b => b.classList.toggle('on', !words.length && b.dataset.dcat === cat));
  };
  const e = state.plan.find(x => x.id === id);
  const intro = e.ext.place === 'cantine' ? 'Ajoute un par un ce qu\'il y avait sur ton plateau : entrée, plat, accompagnement, dessert, pain…' : 'Ajoute chaque plat avec la taille de la portion.';
  const reminder = e.ext.photos.length ? `<div class="photo-strip">${e.ext.photos.map(p => `<img data-photo="${p}" data-act="zoomphoto" data-id="${id}|${p}" alt="Photo du repas">`).join('')}</div>` : '';
  const added = e.ext.items.length ? `<p class="small" style="margin:0 0 10px"><b>Déjà indiqué :</b> ${esc(e.ext.items.map(i => i.label).join(', '))} · ${M.extNutrition(e).kcal} kcal</p>` : '';
  openSheet(`<h2>${e.ext.place === 'cantine' ? 'Sur mon plateau' : 'Plats commandés'}</h2>
    ${reminder}${added}
    <p class="intro">${intro}</p>
    <div class="search" style="padding:0"><input type="search" placeholder="Chercher (poisson, frites, tarte…)" autocomplete="off"></div>
    <div class="chips scroll" style="padding:10px 0 4px">${DISH_CATS.map(c => `<button class="chip" data-dcat="${c.id}">${c.name}</button>`).join('')}</div>
    <div class="pick-list"></div>
    <div class="btn-row"><button class="btn btn-primary" data-act="dishback">J'ai fini</button><button class="btn btn-secondary" data-act="otherdish">Autre plat</button></div>`, root => {
    root.querySelector('input').oninput = ev => { q = ev.target.value; draw(root); };
    root.querySelectorAll('[data-dcat]').forEach(b => { b.onclick = () => { cat = b.dataset.dcat; q = ''; root.querySelector('input').value = ''; draw(root); }; });
    draw(root);
    showPhotos(root);
  });
  ACTIONS.dishback = () => extSheet(id);
  ACTIONS.pickdish = did => {
    const d = M.dish(did);
    openSheet(`<h2>${d.emoji} ${esc(d.name)}</h2><p class="intro">Quelle taille de portion ?</p>
      <div class="stack">${SIZES.map(sz => `<button class="btn btn-secondary" data-act="picksize" data-id="${sz.id}">${sz.name} · ${Math.round(d.kcal * sz.k)} kcal</button>`).join('')}</div>`);
    ACTIONS.picksize = size => {
      A.addExtItem(state, id, M.dishItem(did, size));
      commit();
      toast(`${d.name} ajouté.`);
      dishPicker(id);
    };
  };
  ACTIONS.otherdish = () => {
    openSheet(`<form><h2>Autre plat</h2>
      <p class="intro">Les calories sont parfois indiquées sur le menu ou l'emballage. Sinon, fais au plus proche.</p>
      <div class="field"><label>Plat</label><input name="label" required placeholder="Ex. : Gratin de poisson"></div>
      <div class="field"><label>Calories (kcal)</label><input name="kcal" inputmode="numeric" required></div>
      ${btnRow('Ajouter', 'Retour')}</form>`, root => {
      root.querySelector('[data-cancel]').onclick = () => dishPicker(id);
      root.querySelector('form').addEventListener('submit', ev => {
        ev.preventDefault();
        const f = ev.target;
        const k = num(f.elements.kcal.value);
        if (!(k >= 0)) { f.querySelector('.error').textContent = 'Indique les calories.'; return; }
        A.addExtItem(state, id, { label: f.elements.label.value.trim() || 'Plat', kcal: k });
        commit();
        dishPicker(id);
      });
    });
  };
}

// Bouton 📷 : photo d'abord, on range ensuite (le repas en cours est deviné d'après l'heure).
function currentSlot(d = new Date()) {
  const h = d.getHours();
  return h < 11 ? 'petitdej' : h < 15 ? 'dejeuner' : h < 18 ? 'gouter' : 'diner';
}
$('#quickPhoto').onchange = async ev => {
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  const pid = 'ph-' + M.defaultId();
  try { await P.savePhoto(file, pid); } catch (ex) { toast('Photo non enregistrée : la mémoire du téléphone est peut-être pleine.'); return; }
  const date = T(), slot = currentSlot();
  const existing = state.plan.find(e => e.ext && e.date === date && e.slot === slot);
  const keep = (id, place) => {
    const e = id ? state.plan.find(x => x.id === id) : A.addExtEntry(state, { date, slot, place });
    A.addExtPhoto(state, e.id, pid);
    week = mondayOf(date);
    closeSheet(); commit();
    toast(`Photo rangée : ${M.PLACES[e.ext.place].name.toLowerCase()}, ${slotById(slot).name.toLowerCase()}. Tu indiqueras les plats plus tard.`);
  };
  let saved = false;
  openSheet(`<h2>Où manges-tu ?</h2>
    <img class="photo-full small" data-photo="${pid}" alt="">
    <p class="intro">${esc(slotById(slot).name)} d'aujourd'hui. Tu pourras le changer ensuite.</p>
    <div class="stack">
      ${existing ? `<button class="btn btn-primary" data-act="qp-add">Ajouter à mon repas : ${esc(M.PLACES[existing.ext.place].name)}</button>` : ''}
      <button class="btn ${existing ? 'btn-secondary' : 'btn-primary'}" data-act="qp-place" data-id="cantine">🏢 À la cantine</button>
      <button class="btn btn-secondary" data-act="qp-place" data-id="resto">🍴 Au restaurant</button>
      <button class="btn btn-secondary" data-act="qp-cancel">Annuler</button>
    </div>`, root => showPhotos(root));
  ACTIONS['qp-add'] = () => { saved = true; keep(existing.id); };
  ACTIONS['qp-place'] = place => { saved = true; keep(null, place); };
  ACTIONS['qp-cancel'] = () => { closeSheet(); };
  const watch = setInterval(() => { if (!sheetOpen) { clearInterval(watch); if (!saved) P.deletePhoto(pid); } }, 500);
};

// Choix d'un jour et d'un repas (pour déplacer, placer un reste, ajouter depuis une recette).
function whenFields(date, slot) {
  const days = weekDays(mondayOf(date));
  return `<div class="field"><label>Jour</label>
      <div class="pager" style="padding:0 0 8px"><button type="button" data-wk="-1">‹</button><div class="lab"><span class="wk">${labelWeek(days[0])}</span></div><button type="button" data-wk="1">›</button></div>
      <div class="day-chips">${days.map((d, i) => `<button type="button" class="chip ${d === date ? 'on' : ''}" data-day="${d}">${JOURS_COURT[i]}<small>${Number(d.slice(8))}</small></button>`).join('')}</div>
      <input type="hidden" name="date" value="${date}"></div>
    <div class="field"><label>Repas</label><div class="seg">${M.SLOTS.map(s => `<label><input type="radio" name="slot" value="${s.id}" ${s.id === slot ? 'checked' : ''}>${s.short}</label>`).join('')}</div></div>`;
}
function bindWhen(root) {
  const input = root.querySelector('[name=date]');
  const drawDays = monday => {
    const days = weekDays(monday);
    root.querySelector('.wk').textContent = labelWeek(monday);
    root.querySelector('.day-chips').innerHTML = days.map((d, i) => `<button type="button" class="chip ${d === input.value ? 'on' : ''}" data-day="${d}">${JOURS_COURT[i]}<small>${Number(d.slice(8))}</small></button>`).join('');
    bindDays();
  };
  let monday = mondayOf(input.value);
  const bindDays = () => root.querySelectorAll('[data-day]').forEach(b => {
    b.onclick = () => { input.value = b.dataset.day; root.querySelectorAll('[data-day]').forEach(x => x.classList.toggle('on', x === b)); };
  });
  root.querySelectorAll('[data-wk]').forEach(b => { b.onclick = () => { monday = addDays(monday, 7 * Number(b.dataset.wk)); drawDays(monday); }; });
  bindDays();
}

ACTIONS.move = id => {
  const e = state.plan.find(x => x.id === id);
  openSheet(`<form><h2>Déplacer le repas</h2>${whenFields(e.date, e.slot)}${btnRow('Déplacer')}</form>`, root => {
    bindWhen(root);
    bindForm(root, form => {
      A.updateEntry(state, id, { date: form.elements.date.value, slot: form.elements.slot.value });
      closeSheet(); commit(); toast('Repas déplacé.');
    });
  });
};

ACTIONS.leftover = id => {
  const e = state.plan.find(x => x.id === id);
  const next = e.slot === 'diner' ? [addDays(e.date, 1), 'dejeuner'] : [e.date, 'diner'];
  openSheet(`<form><h2>Placer le reste</h2>
    <p class="intro">Le reste ne sera pas compté dans la liste de courses.</p>
    ${whenFields(next[0], next[1])}${btnRow('Placer')}</form>`, root => {
    bindWhen(root);
    bindForm(root, form => {
      A.addLeftover(state, id, { date: form.elements.date.value, slot: form.elements.slot.value, table: 1 });
      closeSheet(); commit(); toast('Reste placé.');
    });
  });
};

/* ================= Recettes ================= */

function recRow(r, act = 'recipe') {
  const n = M.nutrition(state, r);
  const fam = M.mainFamily(state, r);
  const bits = [];
  if (r.time) bits.push(`${r.time} min`);
  if (fam && r.type !== 'accomp') bits.push(`${famById(fam).icon} ${famById(fam).name}`);
  if ((r.servings || 1) > 1) bits.push(`pour ${r.servings}`);
  if (SRC[r.src]) bits.push(SRC[r.src]);
  return `<div class="rec" data-act="${act}" data-id="${r.id}">
    <span class="em">${r.emoji}</span>
    <div class="main"><p class="t">${state.favorites.includes(r.id) ? '♥ ' : ''}${esc(r.name)}</p><p class="s">${esc(bits.join(' · '))}</p></div>
    <span class="kc">${n.kcal}<small>kcal</small></span>
  </div>`;
}

function viewRecettes() {
  const f = recFilter;
  return `<div class="search"><input type="search" id="recq" placeholder="Chercher une recette ou un ingrédient" value="${esc(f.q)}" autocomplete="off"></div>
    <div class="chips scroll">
      <button class="chip ${!f.type ? 'on' : ''}" data-act="rtype" data-id="">Tout</button>
      ${M.TYPES.map(t => `<button class="chip ${f.type === t.id ? 'on' : ''}" data-act="rtype" data-id="${t.id}">${t.name}</button>`).join('')}
    </div>
    <div class="chips scroll">
      <button class="chip ${f.fav ? 'on' : ''}" data-act="rfav">♥ Favoris</button>
      <button class="chip ${f.quick ? 'on' : ''}" data-act="rquick">⏱ 15 min max</button>
      ${M.FAMILIES.map(x => `<button class="chip ${f.fam === x.id ? 'on' : ''}" data-act="rfam" data-id="${x.id}">${x.icon} ${x.name}</button>`).join('')}
    </div>
    <div id="reclist"></div>`;
}
function drawRecList() {
  const list = M.filterRecipes(state, recFilter).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const hiddenCount = state.hidden.length;
  $('#reclist').innerHTML = `<p class="count">${plural(list.length, 'recette')}${hiddenCount ? ` · ${hiddenCount} masquée${hiddenCount > 1 ? 's' : ''} (voir Réglages)` : ''}</p>
    <div class="section"><div class="card" style="padding:0 14px">${list.map(r => recRow(r)).join('') || '<p class="empty">Aucune recette ne correspond.</p>'}</div></div>
    <div class="section" style="margin-top:12px"><button class="btn btn-secondary" data-act="newcomp">✎ Créer mon propre repas</button></div>`;
}
function mountRecettes(root) {
  const input = root.querySelector('#recq');
  input.oninput = () => { recFilter.q = input.value; drawRecList(); };
  drawRecList();
}
ACTIONS.rtype = id => { recFilter.type = id; render(); };
ACTIONS.rfav = () => { recFilter.fav = !recFilter.fav; render(); };
ACTIONS.rquick = () => { recFilter.quick = !recFilter.quick; render(); };
ACTIONS.rfam = id => { recFilter.fam = recFilter.fam === id ? '' : id; render(); };

// Fiche recette, avec choix du nombre de portions.
let sheetPortions = 1;
ACTIONS.recipe = (id, el) => {
  const r = M.recipe(state, id);
  if (!r) return;
  if (!el || !el.dataset.keep) sheetPortions = r.servings || 1;
  const n = M.nutrition(state, r);
  const fam = M.mainFamily(state, r);
  const fav = state.favorites.includes(r.id);
  const hidden = state.hidden.includes(r.id);
  const meta = [M.TYPES.find(t => t.id === r.type).one];
  if (r.time) meta.push(`${r.time} min`);
  if (fam) meta.push(`${famById(fam).icon} ${famById(fam).name}`);
  if (SRC[r.src]) meta.push(r.src === 'programme' ? 'Programme sportif' : r.src === 'livre' ? 'Inspirée du livre' : 'Ma recette');
  let h = `<div class="r-head"><span class="em">${r.emoji}</span><div><h2>${esc(r.name)}</h2><p class="s">${esc(meta.join(' · '))}</p></div></div>
    <div class="macros"><div><b>${n.kcal}</b><span>kcal</span></div><div><b>${n.p} g</b><span>Prot.</span></div><div><b>${n.c} g</b><span>Gluc.</span></div><div><b>${n.f} g</b><span>Lip.</span></div></div>
    <p class="small muted" style="margin:-6px 0 12px">Pour une portion. Valeurs indicatives.</p>
    <div class="stepper-row"><span class="lbl">Ingrédients pour</span>
      <div class="stepper"><button data-act="rportions" data-id="${r.id}|-1">−</button><b>${sheetPortions}</b><button data-act="rportions" data-id="${r.id}|1">+</button></div></div>
    <ul class="ings">${M.scaled(r, sheetPortions).map(([iid, q]) => {
      const ing = M.ingredient(state, iid);
      if (!ing) return '';
      const l = M.formatLine(ing, q);
      return `<li><span class="q">${esc(l.qty)}</span><span>${esc(l.name)}${l.hint ? `<span class="h">${esc(l.hint)}</span>` : ''}</span></li>`;
    }).join('')}</ul>`;
  if (r.steps && r.steps.length) h += `<h3>Préparation</h3><ol class="steps-list">${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`;
  h += `<div class="actions-grid">
    <button class="btn btn-primary wide" data-act="addplan" data-id="${r.id}">Ajouter à mon menu</button>
    <button class="btn btn-secondary" data-act="fav" data-id="${r.id}">${fav ? '♥ Favori' : '♡ Favori'}</button>
    <button class="btn btn-secondary" data-act="adapt" data-id="${r.id}">✎ ${r.custom ? 'Modifier' : 'Adapter'}</button>
    ${r.custom
      ? `<button class="btn btn-danger wide" data-act="delrec" data-id="${r.id}">Supprimer ma recette</button>`
      : `<button class="btn btn-secondary wide" data-act="hide" data-id="${r.id}">${hidden ? 'Proposer à nouveau cette recette' : "Je n'aime pas : ne plus la proposer"}</button>`}
  </div>`;
  openSheet(h);
};
ACTIONS.rportions = v => {
  const [id, d] = v.split('|');
  sheetPortions = Math.max(1, sheetPortions + Number(d));
  ACTIONS.recipe(id, { dataset: { keep: '1' } });
};
ACTIONS.fav = id => { const on = A.toggleFavorite(state, id); S.save(state); render(); ACTIONS.recipe(id, { dataset: { keep: '1' } }); toast(on ? 'Ajoutée aux favoris.' : 'Retirée des favoris.'); };
ACTIONS.hide = id => { const on = A.toggleHidden(state, id); closeSheet(); commit(); toast(on ? 'Elle ne sera plus proposée.' : 'Elle est de nouveau proposée.'); };
ACTIONS.delrec = id => {
  const r = M.recipe(state, id);
  closeSheet();
  withUndo(`${r.name} supprimée.`, () => A.deleteCustomRecipe(state, id));
};

ACTIONS.addplan = id => {
  const r = M.recipe(state, id);
  const date = week === mondayOf(T()) ? T() : week;
  const slot = r.type === 'petitdej' ? 'petitdej' : r.type === 'gouter' ? 'gouter' : 'dejeuner';
  const portions = Math.max(sheetPortions, state.settings.table);
  openSheet(`<form><h2>Ajouter à mon menu</h2><p class="intro">${esc(r.name)}</p>
    ${whenFields(date, slot)}
    <div class="stepper-row"><span class="lbl">Portions à cuisiner<small>Les portions en plus deviennent des restes à placer</small></span>
      <div class="stepper"><button type="button" data-p="-1">−</button><b id="pp">${portions}</b><button type="button" data-p="1">+</button></div></div>
    ${btnRow('Ajouter')}</form>`, root => {
    let p = portions;
    root.querySelectorAll('[data-p]').forEach(b => { b.onclick = () => { p = Math.max(1, p + Number(b.dataset.p)); root.querySelector('#pp').textContent = p; }; });
    bindWhen(root);
    bindForm(root, form => {
      const d = form.elements.date.value;
      const e = A.addEntry(state, { date: d, slot: form.elements.slot.value, recipeId: id, portions: p, table: Math.min(p, state.settings.table) });
      week = mondayOf(d);
      closeSheet(); commit();
      toast(M.leftoverLeft(state, e) > 0 ? `Ajouté. Il restera ${plural(M.leftoverLeft(state, e), 'portion')} : touche le repas pour les placer.` : 'Ajouté à ton menu.');
    });
  });
};

/* ================= Composer ================= */

function newDraft(from) {
  if (from) {
    return { id: from.custom ? from.id : null, name: from.custom ? from.name : `${from.name} (ma version)`, emoji: from.emoji, type: from.type,
      time: from.time || '', servings: from.servings || 1, ing: from.ing.map(([i, q]) => [i, q]), steps: [...(from.steps || [])] };
  }
  return { id: null, name: '', emoji: '🍽️', type: 'repas', time: '', servings: 1, ing: [], steps: [] };
}
ACTIONS.adapt = id => { state.draft = newDraft(M.recipe(state, id)); closeSheet(); S.save(state); go('composer'); };
ACTIONS.newcomp = () => { state.draft = newDraft(); S.save(state); go('composer'); };

const EMOJIS = ['🍽️', '🥗', '🍲', '🍛', '🍝', '🥙', '🌯', '🍳', '🥚', '🌱', '🫘', '🐟', '🍣', '🧀', '🥣', '🍞', '🍎', '🍓', '🥑', '🍠'];

function draftTotals() {
  const d = state.draft;
  return M.nutrition(state, { ing: d.ing, servings: d.servings || 1 });
}

function viewComposer() {
  if (!state.draft) state.draft = newDraft();
  const d = state.draft;
  const n = draftTotals();
  const groups = {};
  for (const [id] of d.ing) {
    const ing = M.ingredient(state, id);
    if (ing) (groups[ing.group] = groups[ing.group] || []).push(id);
  }
  let lines = '';
  d.ing.forEach(([id, q], i) => {
    const ing = M.ingredient(state, id);
    if (!ing) return;
    const u = UNITS[ing.unit];
    const k = Math.round(q * (ing.w || 1) / 100 * ing.kcal / (d.servings || 1));
    lines += `<div class="comp-line"><div class="n">${esc(ing.unit === 'pc' && q > 1 && ing.pl ? ing.pl : ing.name)}<small>${k} kcal par portion${ing.cooked && ing.unit === 'g' ? ` · ≈ ${Math.round(q * ing.cooked)} g cuit` : ''}</small></div>
      <input inputmode="decimal" data-qty="${i}" value="${String(Math.round(q * 100) / 100).replace('.', ',')}" aria-label="Quantité">
      <span class="u">${ing.unit === 'pc' ? 'pièce' : u.label}</span>
      <button class="x" data-act="cdel" data-id="${i}" aria-label="Retirer">×</button></div>`;
  });
  const missing = ['proteine', 'feculent', 'legume'].filter(g => !groups[g]);
  const advice = d.ing.length && missing.length
    ? `<p class="small muted" style="margin:8px 0 0">Idée d'assiette équilibrée : il manque ${missing.map(g => GROUPS.find(x => x.id === g).name.toLowerCase()).join(', ')}.</p>` : '';
  return `<div class="sticky-total"><div><b>${n.kcal} kcal</b> <span>par portion</span></div><span>Prot. ${n.p} g · Gluc. ${n.c} g · Lip. ${n.f} g</span></div>
    <div class="section" style="margin-top:12px">
      <p class="small muted" style="margin:0 0 12px">Compose ton assiette ingrédient par ingrédient : les calories se calculent toutes seules. Ton repas rejoint ensuite tes recettes.</p>
      <div class="field"><label>Nom du repas</label><input id="cname" value="${esc(d.name)}" placeholder="Ex. : Bol tofu, riz et légumes"></div>
      <div class="row2">
        <div class="field"><label>Type</label><select id="ctype">${M.TYPES.map(t => `<option value="${t.id}" ${t.id === d.type ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div>
        <div class="field"><label>Préparation (min)</label><input id="ctime" inputmode="numeric" value="${esc(d.time)}" placeholder="20"></div>
      </div>
      <div class="stepper-row"><span class="lbl">Les quantités sont pour<small>Le nombre de portions de la recette</small></span>
        <div class="stepper"><button data-act="cserv" data-id="-1">−</button><b>${d.servings}</b><button data-act="cserv" data-id="1">+</button></div></div>
      <div class="field"><label>Icône</label><div class="chips" style="padding:0">${EMOJIS.map(e => `<button class="chip ${e === d.emoji ? 'on' : ''}" data-act="cemoji" data-id="${e}" style="font-size:18px;padding:4px 8px">${e}</button>`).join('')}</div></div>
    </div>
    <div class="section-title">Ingrédients <button class="link" data-act="cadd">+ Ajouter</button></div>
    <div class="section"><div class="card" style="padding:4px 14px">${lines || '<p class="empty">Aucun ingrédient pour l\'instant.</p>'}</div>${advice}
      <button class="btn btn-secondary" style="margin-top:10px" data-act="cadd">+ Ajouter un ingrédient</button></div>
    <div class="section-title">Préparation (facultatif)</div>
    <div class="section"><div class="field"><textarea id="csteps" placeholder="Une étape par ligne">${esc(d.steps.join('\n'))}</textarea></div>
      <p class="error" id="cerr"></p>
      <div class="btn-row"><button class="btn btn-secondary" data-act="creset">Tout effacer</button><button class="btn btn-primary" data-act="csave">${d.id ? 'Enregistrer' : 'Créer le repas'}</button></div>
    </div><div style="height:16px"></div>`;
}

function readDraftFields(root = $('#view')) {
  const d = state.draft;
  if (!d || !root.querySelector('#cname')) return;
  d.name = root.querySelector('#cname').value;
  d.type = root.querySelector('#ctype').value;
  d.time = root.querySelector('#ctime').value;
  d.steps = root.querySelector('#csteps').value.split('\n');
}

function mountComposer(root) {
  const save = () => { readDraftFields(root); S.save(state); };
  root.querySelectorAll('#cname, #ctype, #ctime, #csteps').forEach(el => { el.onchange = save; });
  root.querySelectorAll('[data-qty]').forEach(inp => {
    inp.onchange = () => {
      const v = num(inp.value);
      const i = Number(inp.dataset.qty);
      if (v > 0) state.draft.ing[i][1] = v;
      readDraftFields(root);
      commit();
    };
  });
}
ACTIONS.cserv = d => { readDraftFields(); state.draft.servings = Math.max(1, state.draft.servings + Number(d)); commit(); };
ACTIONS.cemoji = e => { readDraftFields(); state.draft.emoji = e; commit(); };
ACTIONS.cdel = i => { readDraftFields(); state.draft.ing.splice(Number(i), 1); commit(); };
ACTIONS.creset = () => { const snap = JSON.stringify(state.draft); state.draft = newDraft(); commit(); toast('Repas effacé.', () => { state.draft = JSON.parse(snap); commit(); }); };
ACTIONS.csave = () => {
  readDraftFields();
  try {
    const rec = A.saveCustomRecipe(state, state.draft);
    state.draft = null;
    commit();
    toast(`${rec.name} enregistré dans tes recettes.`);
    ACTIONS.recipe(rec.id);
  } catch (ex) { $('#cerr').textContent = ex.message; }
};

// Choix d'un ingrédient, rangé par groupe, avec recherche.
ACTIONS.cadd = () => {
  readDraftFields();
  S.save(state);
  let q = '';
  let group = 'proteine';
  const draw = root => {
    const words = M.norm(q).split(/\s+/).filter(Boolean);
    const list = M.allIngredients(state)
      .filter(i => (words.length ? words.every(w => M.norm(i.name).includes(w)) : i.group === group))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    root.querySelector('.pick-list').innerHTML = list.map(i => `<div class="pick" data-act="cpick" data-id="${i.id}">${esc(i.name)}<span>${i.kcal} kcal/100 g</span></div>`).join('')
      || '<p class="empty">Introuvable. Tu peux le créer ci-dessous.</p>';
    root.querySelectorAll('[data-g]').forEach(b => b.classList.toggle('on', !words.length && b.dataset.g === group));
  };
  openSheet(`<h2>Ajouter un ingrédient</h2>
    <div class="search" style="padding:0"><input type="search" placeholder="Chercher un ingrédient" autocomplete="off"></div>
    <div class="chips scroll" style="padding:10px 0 4px">${GROUPS.map(g => `<button class="chip" data-g="${g.id}">${g.name}</button>`).join('')}</div>
    <div class="pick-list"></div>
    <button class="btn btn-secondary" style="margin-top:12px" data-act="newing">Il n'est pas dans la liste : le créer</button>`, root => {
    root.querySelector('input').oninput = e => { q = e.target.value; draw(root); };
    root.querySelectorAll('[data-g]').forEach(b => { b.onclick = () => { group = b.dataset.g; q = ''; root.querySelector('input').value = ''; draw(root); }; });
    draw(root);
  });
};
ACTIONS.cpick = id => {
  const ing = M.ingredient(state, id);
  const def = { g: 100, ml: 100, pc: 1, cas: 1, cac: 1, tranche: 1, botte: 0.25, pincee: 1 }[ing.unit] ?? 1;
  const u = ing.unit === 'pc' ? (ing.pl ? 'pièce(s)' : 'pièce(s)') : UNITS[ing.unit].label;
  openSheet(`<form><h2>${esc(ing.name)}</h2>
    <p class="intro">${ing.kcal} kcal pour 100 g${ing.unit !== 'g' && ing.unit !== 'ml' ? ` · 1 ${ing.unit === 'pc' ? 'pièce' : UNITS[ing.unit].label} ≈ ${ing.w} g` : ''}${ing.cooked ? ` · poids sec (× ${ing.cooked} une fois cuit)` : ''}</p>
    <div class="field"><label>Quantité (${esc(u)})${state.draft.servings > 1 ? ` pour ${state.draft.servings} portions` : ''}</label><input name="q" inputmode="decimal" value="${String(def).replace('.', ',')}" required></div>
    ${btnRow('Ajouter')}</form>`, root => {
    const inp = root.querySelector('[name=q]');
    inp.focus(); inp.select();
    bindForm(root, form => {
      const v = num(form.elements.q.value);
      if (!(v > 0)) throw new Error('Indique une quantité.');
      const ex = state.draft.ing.find(([i]) => i === id);
      if (ex) ex[1] += v; else state.draft.ing.push([id, v]);
      closeSheet(); commit();
    });
  });
};
ACTIONS.newing = () => {
  openSheet(`<form><h2>Nouvel ingrédient</h2>
    <p class="intro">Les valeurs sont sur l'emballage (« pour 100 g »).</p>
    <div class="field"><label>Nom</label><input name="name" required></div>
    <div class="row2">
      <div class="field"><label>Groupe</label><select name="group">${GROUPS.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}</select></div>
      <div class="field"><label>Rayon</label><select name="aisle">${AISLES.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Protéine principale ?</label><select name="fam"><option value="">Non</option>${M.FAMILIES.map(f => `<option value="${f.id}">${f.icon} ${f.name}</option>`).join('')}</select></div>
    <div class="row2">
      <div class="field"><label>Compté en</label><select name="unit"><option value="g">grammes</option><option value="pc">pièces</option></select></div>
      <div class="field"><label>Poids d'une pièce (g)</label><input name="w" inputmode="decimal" placeholder="si pièces"></div>
    </div>
    <div class="row2">
      <div class="field"><label>kcal / 100 g</label><input name="kcal" inputmode="decimal" required></div>
      <div class="field"><label>Protéines</label><input name="p" inputmode="decimal" placeholder="g"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Glucides</label><input name="c" inputmode="decimal" placeholder="g"></div>
      <div class="field"><label>Lipides</label><input name="f" inputmode="decimal" placeholder="g"></div>
    </div>
    ${btnRow('Créer')}</form>`, root => bindForm(root, form => {
    const v = n => { const x = num(form.elements[n].value); return Number.isFinite(x) ? x : 0; };
    const kc = num(form.elements.kcal.value);
    if (!Number.isFinite(kc)) throw new Error('Indique les calories pour 100 g.');
    const ing = A.addCustomIngredient(state, {
      name: form.elements.name.value, group: form.elements.group.value, aisle: form.elements.aisle.value, fam: form.elements.fam.value,
      unit: form.elements.unit.value, w: v('w'), kcal: kc, p: v('p'), c: v('c'), f: v('f'),
    });
    S.save(state);
    ACTIONS.cpick(ing.id);
  }));
};

/* ================= Courses ================= */

const aisleInfo = id => (id === 'placard' ? { name: 'Placard : vérifie ce qu\'il te reste', icon: '🗄️' } : AISLES.find(a => a.id === id) || { name: id, icon: '•' });

function viewCourses() {
  const groups = M.shoppingList(state, week);
  const shop = state.shopping[week] || { checked: [], extras: [] };
  const all = groups.flatMap(g => g.items);
  const done = all.filter(i => shop.checked.includes(i.id)).length + shop.extras.filter(x => x.done).length;
  const total = all.length + shop.extras.length;
  let h = pager(weekLabel(week), labelWeek(week), 'week');
  if (!all.length && !shop.extras.length) {
    return h + `<div class="banner info"><span>Rien à acheter : ajoute d'abord des repas à cette semaine.</span><button class="btn btn-primary" data-act="gosemaine">Ma semaine</button></div>`;
  }
  h += `<div class="lead-actions"><button class="btn btn-primary" data-act="shareshop">Partager la liste</button><button class="btn btn-secondary" data-act="uncheck">Tout décocher</button></div>
    <p class="count">${done} / ${total} dans le panier · quantités arrondies au-dessus</p>`;
  for (const g of groups) {
    const a = aisleInfo(g.aisle);
    h += `<div class="section-title">${a.icon} ${esc(a.name)}</div><div class="section"><div class="card" style="padding:0 14px">`;
    for (const it of g.items) {
      const on = shop.checked.includes(it.id);
      h += `<div class="shop-item ${on ? 'on' : ''}" data-act="shop" data-id="${it.id}"><span class="box">✓</span>
        <div class="main"><p class="t">${esc(it.name)}</p><p class="s">${esc(it.used.join(', '))}</p></div><span class="q">${esc(it.buy)}</span></div>`;
    }
    h += '</div></div>';
  }
  h += `<div class="section-title">✚ En plus</div><div class="section"><div class="card" style="padding:0 14px">
    ${shop.extras.map(x => `<div class="shop-item ${x.done ? 'on' : ''}" data-act="extra" data-id="${x.id}"><span class="box">✓</span><div class="main"><p class="t">${esc(x.text)}</p></div><button class="x link" style="color:var(--coral)" data-act="delextra" data-id="${x.id}" aria-label="Retirer">×</button></div>`).join('')}
    <form class="add-row" id="extraForm" style="padding:10px 0"><input name="t" placeholder="Ex. : liquide vaisselle" autocomplete="off"><button class="btn btn-primary">Ajouter</button></form>
    </div></div><div style="height:16px"></div>`;
  return h;
}
function mountCourses(root) {
  const f = root.querySelector('#extraForm');
  if (f) f.onsubmit = e => { e.preventDefault(); A.addShopExtra(state, week, f.elements.t.value); commit(); };
}
ACTIONS.gosemaine = () => go('semaine');
ACTIONS.shop = id => { A.toggleShopItem(state, week, id); commit(); };
ACTIONS.extra = id => { A.toggleShopExtra(state, week, id); commit(); };
ACTIONS.delextra = id => { A.removeShopExtra(state, week, id); commit(); };
ACTIONS.uncheck = () => withUndo('Liste décochée.', () => A.uncheckAll(state, week));
ACTIONS.shareshop = async () => {
  const shop = state.shopping[week] || { checked: [], extras: [] };
  const lines = [`Courses ${labelWeek(week)}`];
  for (const g of M.shoppingList(state, week)) {
    const items = g.items.filter(i => !shop.checked.includes(i.id));
    if (!items.length) continue;
    lines.push('', aisleInfo(g.aisle).name.toUpperCase());
    for (const i of items) lines.push(`- ${i.name} : ${i.buy}`);
  }
  const extras = shop.extras.filter(x => !x.done);
  if (extras.length) { lines.push('', 'EN PLUS'); for (const x of extras) lines.push(`- ${x.text}`); }
  const text = lines.join('\n');
  try {
    if (navigator.share) { await navigator.share({ title: 'Liste de courses', text }); return; }
    await navigator.clipboard.writeText(text);
    toast('Liste copiée : colle-la où tu veux.');
  } catch (e) { if (e && e.name !== 'AbortError') toast('Partage impossible sur cet appareil.'); }
};

/* ================= Réglages ================= */

function viewReglages() {
  const s = state.settings;
  const hidden = state.hidden.map(id => M.recipe(state, id)).filter(Boolean);
  const pr = s.profile || { sex: 'f', activity: 'repos', goal: 'maintenir' };
  return `<div class="section-title">Mon objectif de calories</div>
    <div class="section"><div class="card"><form id="needForm">
      <p class="small muted" style="margin:0 0 12px">Ces informations restent sur ton téléphone. Le calcul suit la formule de Mifflin-St Jeor, une estimation courante.</p>
      <div class="seg"><label><input type="radio" name="sex" value="f" ${pr.sex !== 'h' ? 'checked' : ''}>Femme</label><label><input type="radio" name="sex" value="h" ${pr.sex === 'h' ? 'checked' : ''}>Homme</label></div>
      <div class="row2" style="gap:8px">
        <div class="field"><label>Âge</label><input name="age" inputmode="numeric" value="${pr.age || ''}"></div>
        <div class="field"><label>Taille (cm)</label><input name="height" inputmode="numeric" value="${pr.height || ''}"></div>
        <div class="field"><label>Poids (kg)</label><input name="weight" inputmode="decimal" value="${pr.weight ? String(pr.weight).replace('.', ',') : ''}"></div>
      </div>
      <div class="field"><label>Mon activité en ce moment</label><select name="activity">${M.ACTIVITY.map(a => `<option value="${a.id}" ${a.id === pr.activity ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Mon but</label><select name="goal">${M.GOALS.map(g => `<option value="${g.id}" ${g.id === pr.goal ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></div>
      <div id="needResult"></div>
      <button class="btn btn-primary" id="needUse" disabled>Utiliser cet objectif</button>
    </form></div></div>
    <div class="section-title">Mes repères</div>
    <div class="section"><div class="card"><form id="setForm">
      <div class="field"><label>Objectif de calories par jour</label><input name="kcal" inputmode="numeric" value="${s.kcalTarget || ''}" placeholder="Ex. : 1800">
        <p class="hint">Sert de repère sur chaque journée. Demande conseil à un professionnel de santé pour fixer ton objectif.</p></div>
      <div class="field"><label>Personnes à table d'habitude</label><input name="table" inputmode="numeric" value="${s.table}">
        <p class="hint">Nombre de portions cuisinées par défaut. Les calories affichées restent celles d'une portion (la tienne).</p></div>
      <button class="btn btn-primary">Enregistrer</button>
    </form></div></div>
    <div class="section-title">Recettes masquées</div>
    <div class="section"><div class="card" style="padding:0 14px">${hidden.length ? hidden.map(r => recRow(r)).join('') : '<p class="empty">Aucune. Dans une recette, « Je n\'aime pas » la retire des propositions.</p>'}</div></div>
    <div class="section-title">Sauvegarde</div>
    <div class="section"><div class="card stack">
      <p class="small muted" style="margin:0">Tes données restent sur ce téléphone. Fais une sauvegarde de temps en temps (changement de téléphone, nettoyage du navigateur).</p>
      <button class="btn btn-secondary" data-act="backup">Télécharger une sauvegarde</button>
      <label class="btn btn-secondary" for="restoreFile">Restaurer une sauvegarde</label>
      <input type="file" id="restoreFile" accept="application/json,.json" class="hide">
      ${installPrompt ? '<button class="btn btn-primary" data-act="install">Installer l\'appli</button>' : ''}
    </div></div>
    <p class="small muted" style="padding:8px 16px 0;margin:0">Les photos des repas ne sont pas dans la sauvegarde (trop lourdes) : seuls les plats et leurs calories y sont.</p>
    <p class="count" style="text-align:center;padding:18px 16px">Mon Assiette ${APP_VERSION} · ${M.allRecipes(state).length} recettes · ${M.allIngredients(state).length} ingrédients<br>Valeurs nutritionnelles indicatives (ordres de grandeur de la table Ciqual).</p>`;
}
function readProfile(f) {
  return {
    sex: f.elements.sex.value || 'f', age: Math.round(num(f.elements.age.value)), height: Math.round(num(f.elements.height.value)),
    weight: Math.round(num(f.elements.weight.value) * 10) / 10, activity: f.elements.activity.value, goal: f.elements.goal.value,
  };
}
function mountReglages(root) {
  const nf = root.querySelector('#needForm');
  const showNeeds = () => {
    const r = M.estimateNeeds(readProfile(nf));
    const out = nf.querySelector('#needResult');
    nf.querySelector('#needUse').disabled = !r;
    if (!r) { out.innerHTML = '<p class="small muted" style="margin:0 0 12px">Remplis âge, taille et poids pour voir le résultat.</p>'; return; }
    nf.querySelector('#needUse').textContent = `Utiliser ${r.target.toLocaleString('fr-FR')} kcal par jour`;
    out.innerHTML = `<div class="summary" style="margin:0 0 12px">
      <div class="row"><span>Au repos complet (métabolisme de base)</span><b>${r.bmr.toLocaleString('fr-FR')} kcal</b></div>
      <div class="row"><span>Pour garder ton poids avec cette activité</span><b>${r.maintain.toLocaleString('fr-FR')} kcal</b></div>
      <div class="row"><span><b>Objectif conseillé</b></span><b>${r.target.toLocaleString('fr-FR')} kcal</b></div>
      <div class="row"><span>Protéines, au moins</span><b>${r.protein} g / jour</b></div></div>
      ${r.floored ? '<p class="small" style="color:var(--gold);margin:0 0 12px">Objectif remonté au minimum conseillé : descendre plus bas fatigue et fait perdre du muscle.</p>' : ''}
      <p class="small muted" style="margin:0 0 12px">C'est une estimation. Si tu ne peux pas bouger pour une raison de santé, demande à ton médecin ou à un·e diététicien·ne.</p>`;
  };
  nf.oninput = showNeeds;
  nf.onchange = showNeeds;
  showNeeds();
  nf.onsubmit = e => {
    e.preventDefault();
    const pr = readProfile(nf);
    const r = M.estimateNeeds(pr);
    if (!r) return;
    state.settings.profile = pr;
    state.settings.kcalTarget = r.target;
    commit();
    toast(`Objectif : ${r.target.toLocaleString('fr-FR')} kcal par jour.`);
  };
  root.querySelector('#setForm').onsubmit = e => {
    e.preventDefault();
    const f = e.target;
    const k = Math.round(num(f.elements.kcal.value));
    const t = Math.round(num(f.elements.table.value));
    state.settings.kcalTarget = k > 0 ? k : 0;
    state.settings.table = t > 0 ? Math.min(t, 12) : 1;
    commit();
    toast('Réglages enregistrés.');
  };
  root.querySelector('#restoreFile').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const next = S.parseBackup(await file.text());
      const snap = JSON.stringify(state);
      state = next;
      commit();
      toast('Sauvegarde restaurée.', () => { state = S.normalize(JSON.parse(snap)); commit(); });
    } catch (ex) { toast(ex.message); }
  };
}
ACTIONS.backup = () => {
  const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mon-assiette-${T()}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
};
ACTIONS.install = async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  render();
};

/* ================= Démarrage ================= */

render();
if (view === 'semaine') {
  const el = document.getElementById(`d-${T()}`);
  if (el && M.weekEntries(state, week).length) setTimeout(() => el.scrollIntoView({ block: 'start' }), 50);
}
S.requestPersistence();

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (view === 'reglages') render(); });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update(); });
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !navigator.serviceWorker.controller) return;
    if (sheetOpen) return;      // on ne coupe pas une saisie en cours ; la mise à jour s'appliquera au prochain lancement
    reloading = true;
    location.reload();
  });
}

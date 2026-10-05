# Mon Assiette : spécification technique

## 1. Architecture

| Fichier | Rôle |
|---|---|
| `index.html`, `css/app.css` | Coquille, mobile d'abord (≤ 560 px) |
| `js/data/ingredients.js` | Catalogue unique des ingrédients : rayon, groupe, unité, valeurs pour 100 g |
| `js/data/recipes.js` | Recettes de base (pescétariennes) |
| `js/data/dishes.js` | Plats courants de cantine et de restaurant (kcal et protéines par portion normale) |
| `js/photos.js` | Photos des repas dehors : réduites à 1 280 px (JPEG), rangées dans IndexedDB |
| `js/dates.js` | Dates en chaînes locales `YYYY-MM-DD`, semaines du lundi au dimanche |
| `js/model.js` | **Calculs purs** : nutrition, quantités, journées, liste de courses, recherche, suggestions |
| `js/actions.js` | Modifications de l'état |
| `js/store.js` | `localStorage` (clé `mon-assiette:v1`), normalisation, lecture des sauvegardes |
| `js/app.js` | Interface : Semaine, Recettes, Composer, Courses, Réglages |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA installable et hors ligne (réseau d'abord) |
| `tests/` | `data` (cohérence du catalogue, pas de viande), `model`, `store` — `npm test` |

## 2. Données de base

**Ingrédient** : `{ id, name, pl?, aisle, group, unit, w, kcal, p, c, f, fam?, cooked?, pack?, pantry? }`
- `unit` : `g`, `ml`, `pc` (pièce), `cas`, `cac`, `tranche`, `botte`, `pincee` ; `w` = grammes d'une unité.
- `kcal, p, c, f` : pour 100 g. Nutrition d'une ligne = `qty × w / 100 × valeur`.
- `fam` : famille de protéine (`oeufs`, `tofu`, `legumineuses`, `poisson`, `laitier`).
- `cooked` : rapport poids cuit / poids sec (affichage seulement). `pack` : conditionnement pour les courses.
- `pantry` : produit de placard, rangé dans « Placard : vérifie ce qu'il te reste ».

**Recette** : `{ id, name, emoji, type, time, servings, ing: [[idIngrédient, quantité]], steps, src?, tags }`
- `type` : `petitdej`, `repas`, `gouter`, `accomp` (pain, fruit, laitage, sauce, légume d'accompagnement).
- Quantités pour `servings` portions. `src` : `programme`, `livre` ou `perso`.
- Protéine principale = famille qui apporte le plus de protéines (calculée, pas saisie).

## 3. État enregistré

| Clé | Contenu |
|---|---|
| `settings` | `kcalTarget`, `table` (personnes à table), `suggestSlots`, `batch` |
| `plan` | `[{ id, date, slot, recipeId, portions, table, leftoverOf?, done? }]`, ou repas dehors `{ id, date, slot, ext, done? }` |
| `settings.profile` | `{ sex, age, height, weight, activity, goal }` saisis dans Réglages (sur le téléphone) |
| `settings.cantineDays` | jours de cantine (0 = lundi) proposés par défaut |
| `favorites`, `hidden` | identifiants de recettes |
| `customRecipes`, `customIngredients` | créés dans l'appli (identifiants `u-…`, `ui-…`) |
| `shopping[lundi]` | `{ checked: [idIngrédient], extras: [{ id, text, done }] }` |
| `draft` | repas en cours de composition |

## 4. Règles

- **Repas dehors** : `ext = { place: 'cantine' | 'resto', photos: [id], items: [{ id, label, emoji, kcal, p, dishId?, size?, photo? }], estimate? }`.
  Calories = somme des plats ; tant qu'aucun plat n'est indiqué, `estimate` (650 kcal pour un déjeuner
  de cantine prévu par les suggestions) est compté. Jamais dans les courses ni les restes. Portion
  petite / normale / grande = × 0,75 / 1 / 1,3. Les photos d'un repas retiré sont effacées après le délai d'annulation.
- **Objectif de calories** : Mifflin-St Jeor (`10 × poids + 6,25 × taille − 5 × âge − 161` pour une
  femme, `+ 5` pour un homme) × activité (1,2 sans sport … 1,725), moins 0, 300 ou 500 kcal selon le but,
  jamais sous `max(1 200 kcal femme / 1 500 homme, métabolisme de base)`, arrondi à 50.

- **Calories d'une journée** : une portion par repas prévu (celle de l'utilisatrice), restes compris.
- **Portions** : `portions` = cuisinées (courses) ; `table` = mangées au repas. Reste = `portions − table −
  restes déjà placés`. Un reste (`leftoverOf`) n'est pas compté dans les courses. Supprimer un repas
  supprime ses restes.
- **Courses** : somme par ingrédient sur la semaine (lundi → dimanche), puis arrondi au-dessus : pièces à
  l'unité, grammes à 10/50/100 g, conserves en nombre de boîtes.
- **Suggestions** : seulement les cases vides. Pas deux fois la même recette dans la semaine tant que
  possible ; pas la même famille de protéine que les deux repas précédents si possible ; favoris × 3 ;
  recettes masquées exclues. Option *batch* : dîner en double, reste au déjeuner du lendemain.
  Option *compléter* : fruit, laitage puis pain ajoutés tant que la journée est à plus de 150 kcal sous
  l'objectif, sans le dépasser de plus de 100 kcal.

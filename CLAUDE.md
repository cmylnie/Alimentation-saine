# Repères pour travailler sur ce dépôt

- Appli de menus en français (PWA statique, sans dépendance ni build), utilisée sur un téléphone Android (Chrome).
- Lire `docs/SPEC.md` avant de modifier les calculs ou les données.
- Régime de l'utilisatrice : **pas de viande** (poisson oui). Le test `aucune viande` doit toujours passer.
- Un aliment = **un seul ingrédient** dans `js/data/ingredients.js` (jamais deux noms pour le même produit).
  Les recettes (`js/data/recipes.js`) n'utilisent que des identifiants de ce catalogue, dans son unité.
- Calculs purs dans `js/model.js`, modifications d'état dans `js/actions.js`, interface dans `js/app.js`.
  Dates en chaînes locales via `js/dates.js` (jamais `toISOString`).
- Avant de publier : `npm test`, vérifier l'interface dans Chromium (Playwright, viewport 390×844),
  incrémenter `APP_VERSION` (`js/app.js`) et `CACHE` (`sw.js`), compléter `docs/CHANGELOG.md`.
- Textes de l'interface : tutoiement, phrases courtes, vocabulaire non technique.

# Journal des versions

## 1.3.0 — 6 octobre 2026

- Repas pris dehors : il suffit d'écrire le nom des plats (« colin à la crème, riz, yaourt ») ; les
  calories sont estimées d'après les mots reconnus (poisson, sauce, frites, gratin, tarte…). Taille de
  portion en un geste, chiffre modifiable ; une correction est retenue pour la prochaine fois.
- Composer : la liste d'ingrédients s'écrit d'une traite (« laitue, chou rouge, 2 carottes, vinaigrette ») ;
  sans quantité, une portion habituelle est proposée ; un ingrédient inconnu est créé avec des valeurs
  estimées (≈). Raccourcis de quantité (« une poignée », « une portion »…).
- Nouvel ingrédient : seul le nom est obligatoire.
- 47 ingrédients courants en plus (laitue, choux, fruits de saison, camembert, colin, moules, sauces…).

## 1.2.1 — 6 octobre 2026

- Identifiant d'installation explicite (`id` dans le manifeste) : Chrome gardait une installation ratée
  (« appli déjà installée » mais impossible à ouvrir) ; l'appli est désormais vue comme nouvelle et
  s'installe normalement.

## 1.2.0 — 5 octobre 2026

- La photo d'un repas pris dehors sert d'aide-mémoire : on la prend sur le moment, on indique les plats
  plus tard en la regardant. En attendant, le repas compte ≈ 650 kcal (cantine) ou ≈ 900 kcal (restaurant).
- Bouton 📷 sur la semaine : photo d'abord, puis « cantine » ou « restaurant » ; le repas est deviné
  d'après l'heure et les photos suivantes du même repas s'y ajoutent.
- Bandeau « repas pris dehors à renseigner » sur la semaine.

## 1.1.0 — 5 octobre 2026

- Poissons : plus de sardines ni de maquereau ; arrivée de la bonite et de l'églefin (4 nouvelles recettes).
- Cantine et restaurant : photo du plateau ou de chaque plat, choix parmi 46 plats courants avec la
  taille de la portion (ou calories saisies), total du repas compté dans la journée.
- Jours de cantine dans « Me proposer des menus » (déjeuner estimé à 650 kcal en attendant la photo).
- Calcul de l'objectif de calories selon l'âge, la taille, le poids, l'activité du moment et le but.
  Objectif par défaut ramené à 1 600 kcal.

## 1.0.0 — 5 octobre 2026

Première version.
- Semaine : repas par jour (petit-déjeuner, déjeuner, goûter, dîner), calories par repas et par jour,
  objectif quotidien, repas cochés une fois mangés, protéines de la semaine.
- Propositions automatiques variées, option « cuisiner le soir pour le lendemain midi » et complément
  des journées trop légères.
- 93 recettes pescétariennes : programme sportif adapté, recettes inspirées du livre, nouveautés.
- Composer : création d'une assiette ingrédient par ingrédient, ingrédients personnels.
- Courses : un aliment = une ligne, rangées par rayon, quantités arrondies, partage de la liste.
- Sauvegarde et restauration en fichier.

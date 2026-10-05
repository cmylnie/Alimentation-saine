# Mon Assiette

Appli de menus pour téléphone : je choisis mes repas de la semaine, je vois les calories de chaque repas
et de chaque journée, je compose mes propres assiettes, et la liste de courses se fait toute seule.

- Régime **pescétarien** : pas de viande ; poisson, œufs, tofu, tempeh, légumineuses, fromages et laitages.
- Près de 100 recettes : celles du programme sportif (adaptées sans viande), d'autres inspirées du livre
  (*La grignoteuse invétérée*, adaptées), et des nouveautés pour varier.
- S'installe sur l'écran d'accueil et fonctionne **hors connexion**. Les données restent sur le téléphone.

## Installer sur le téléphone

1. Ouvre l'adresse de l'appli dans **Chrome**.
2. Menu **⋮** → **Installer l'application** (ou *Ajouter à l'écran d'accueil*).

## Au quotidien

| Je veux… | Où |
|---|---|
| Remplir ma semaine d'un coup | **Semaine** → *Me proposer des menus* (seules les cases vides sont remplies) |
| Ajouter un repas à un jour précis | **Semaine** → bouton **+** du repas, ou depuis une recette → *Ajouter à mon menu* |
| Mettre plusieurs choses dans un repas (plat + pain + fruit) | Plusieurs **+** dans le même repas |
| Cuisiner pour plusieurs / faire des restes | Toucher le repas → *Portions à cuisiner*, puis *Placer* le reste |
| Noter ce que j'ai mangé | Rond **✓** à gauche du repas |
| Changer un repas | Toucher le repas → *Remplacer* ou *Déplacer* |
| Ne plus jamais voir une recette | Recette → *Je n'aime pas* (on la retrouve dans Réglages) |
| Créer mon assiette | **Composer** : ingrédient par ingrédient, les calories se calculent toutes seules |
| Adapter une recette existante | Recette → *Adapter* (une copie modifiable est créée) |
| Faire les courses | **Courses** : tout est regroupé par rayon, sans doublon, quantités arrondies au-dessus |
| Changer l'objectif de calories | ⚙ Réglages |

Les quantités de féculents sont données **crues** (le poids cuit est indiqué à côté : 50 g de quinoa
cru ≈ 150 g cuit). Les valeurs nutritionnelles sont indicatives.

## Développement

Site statique sans dépendance ni compilation. `npm test` lance les tests, `npm run serve` sert l'appli
sur http://localhost:8080. Voir `docs/SPEC.md`.

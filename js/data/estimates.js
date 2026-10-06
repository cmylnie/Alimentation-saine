// Estimation à partir d'un simple nom, quand on ne connaît ni la recette ni les calories.
// Les textes sont comparés sans accents ni majuscules (voir model.norm).

// Plats : [mots reconnus (expression régulière), kcal d'une portion normale, protéines (g), emoji].
// L'ordre compte : les expressions précises d'abord ; un morceau de texte reconnu n'est compté qu'une fois.
// Les « sauces et cuissons » s'ajoutent au plat (poisson + pané, pâtes + crème…).
export const DISH_RULES = [
  // desserts et plats en plusieurs mots
  ['salade de fruits', 100, 1, '🍇'],
  ['cafe gourmand', 300, 4, '☕'],
  ['mousse au chocolat', 220, 5, '🍫'],
  ['fondant|moelleux au chocolat|brownie', 400, 5, '🍫'],
  ['creme (dessert|caramel|brulee|anglaise)|flan|riz au lait|semoule au lait|panna cotta|ile flottante|liegeois', 180, 4, '🍮'],
  ['tiramisu|cheesecake|eclair|paris.brest|mille.feuilles?|patisseries?|tartelettes?|tarte tatin|tartes? (aux?|a la) (pommes?|poires?|fraises?|citron|abricots?|chocolat|fruits?|framboises?|myrtilles?|prunes?|rhubarbe)|clafoutis|crumble|gateau|cake|cookies?|muffins?|donuts?|financiers?|madeleines?|viennoiseries?|croissants?|pain au chocolat', 330, 5, '🍰'],
  ['glaces?|sorbets?|esquimau', 160, 3, '🍨'],
  ['crepes? (au sucre|sucrees?|a la confiture|au chocolat|nutella)|gaufres?', 300, 6, '🥞'],
  ['compotes?', 80, 0, '🍏'],
  ['yaourts? (aux fruits|sucres?|a boire|a la vanille|a la fraise|aromatises?)', 120, 5, '🍓'],
  ['poke( bowl)?', 600, 30, '🥢'],
  ['sushis?|makis?|california|sashimis?|chirashi', 330, 14, '🍣'],
  ['bo bun|pad thai|nouilles sautees|wok de nouilles|ramen|pho|yakisoba', 550, 20, '🍜'],
  ['paella', 600, 25, '🥘'],
  ['risotto', 550, 14, '🍚'],
  ['couscous', 550, 16, '🍲'],
  ['lasagnes?|cannellonis?|moussaka|parmentier', 550, 22, '🥘'],
  ['brandade', 400, 20, '🐟'],
  ['gratin (dauphinois|de pommes? de terre)|tartiflette', 400, 10, '🥔'],
  ['gratin de (pates|macaronis?|coquillettes)', 450, 16, '🧀'],
  ['quiches?|tartes? (salees?|aux poireaux|aux legumes|au fromage|au thon|au saumon|a la tomate)|flamiche|tourte|feuillete', 380, 12, '🥧'],
  ['croque', 450, 20, '🥪'],
  ['(steak|galette|burger|nuggets?|boulettes?) (vegetale?s?|vegetariens?|vegans?|de soja)', 230, 15, '🌱'],
  ['galettes? (complete|sarrasin|de ble noir)|crepes? (salees?|complete|au fromage|a l.oeuf)', 420, 18, '🫓'],
  ['oeufs? (mayo|mayonnaise)', 220, 7, '🥚'],
  ['salades? (composee|nicoise|cesar|grecque|de chevre chaud|paysanne|du chef|italienne|mexicaine)', 380, 16, '🥗'],
  ['taboule|salades? de (pates|riz|lentilles|pommes de terre|ble|quinoa|pois chiches|haricots|boulgour)', 260, 8, '🥙'],
  ['celeri remoulade|macedoine|piemontaise', 220, 3, '🥗'],
  ['moules?(-| )frites', 700, 32, '🦪'],
  ['fish and chips', 700, 28, '🐟'],
  ['pommes? de terre sautees|pommes sautees|pommes noisettes|potatoes|rostis?', 300, 4, '🥔'],
  ['frites|chips', 380, 5, '🍟'],
  ['purees?', 180, 4, '🥔'],
  ['pommes? de terre|pommes vapeur|patates? douces?|patates', 180, 4, '🥔'],
  ['petits? pois', 120, 7, '🫛'],
  ['haricots verts', 80, 3, '🥦'],
  ['lentilles|pois chiches|haricots (rouges|blancs|secs|noirs)|flageolets|feves', 180, 11, '🫘'],
  ['carottes? rapees?|chou (rouge|blanc) rape|coleslaw|crudites|betteraves?|concombres?|radis|tomates?( cerises?)?', 80, 1, '🥕'],
  // sauces et cuissons (s'ajoutent)
  ['(sauce |a la )?creme|sauce blanche|bechamel|carbonara|beurre blanc|hollandaise|sauce (au )?fromage|normande|dieppoise|nantua|lait de coco|(au|sauce) curry', 130, 2, ''],
  ['mayonnaise|mayo|aioli|sauce tartare|rouille|sauce cocktail|sauce burger|sauce samourai', 100, 0, ''],
  ['vinaigrette', 60, 0, ''],
  ['panes?|panees?|frits?|frites?\\b|friture|beignets?|tempura', 120, 3, ''],
  ['gratinee?s?|au fromage|parmesan|fromage rape|emmental rape|gruyere', 80, 5, ''],
  ['(au|de) beurre', 70, 0, ''],
  ['pesto', 90, 2, ''],
  // plats d'un mot
  ['pizzas?', 800, 32, '🍕'],
  ['burgers?|hamburgers?|cheeseburgers?', 550, 25, '🍔'],
  ['sandwichs?|paninis?|wraps?|tacos|burritos?|bagels?|kebab|fajitas?|quesadillas?|club', 480, 20, '🌯'],
  ['falafels?', 350, 12, '🧆'],
  ['tofu|tempeh|seitan', 200, 18, '🌱'],
  ['chili|curry|dahl|dhal|colombo|tajine|tagine|korma|massala', 420, 16, '🍛'],
  ['gratins?', 250, 12, '🧀'],
  ['omelettes?', 260, 17, '🍳'],
  ['oeufs?', 90, 7, '🥚'],
  ['saumon', 300, 28, '🍣'],
  ['thon|bonite', 200, 30, '🐟'],
  ['truite', 220, 26, '🐟'],
  ['moules', 300, 30, '🦪'],
  ['crevettes?|gambas|fruits de mer|calamars?|encornets?|seiches?|saint.jacques|crabe|langoustines?|poulpe', 170, 22, '🦐'],
  ['surimi', 100, 8, '🦀'],
  ['poissons?|cabillaud|colin|lieu|merlu|eglefin|dorade|bar|loup|merlan|limande|sole|julienne|hoki|tilapia|perche|filet', 170, 25, '🐟'],
  ['soupes?|veloutes?|potages?|gaspacho|bouillon|minestrone', 130, 4, '🥣'],
  ['salades?|laitue|mache|roquette|batavia', 40, 1, '🥬'],
  ['spaghettis?|tagliatelles?|penne|macaronis?|coquillettes|fusillis?|raviolis?|gnocchis?|tortellinis?|pates|nouilles', 300, 10, '🍝'],
  ['riz', 220, 5, '🍚'],
  ['semoule|boulgour|quinoa|ble|ebly|polenta|epeautre|orge', 220, 7, '🌾'],
  ['brocolis?|courgettes?|ratatouille|epinards|carottes?|chou.fleur|choux?|poelee|legumes|poireaux|aubergines?|champignons|endives?|navets?|celeri|fenouil|potiron|courge|butternut|asperges?|artichauts?|blettes|poivrons?|piperade', 90, 3, '🥦'],
  ['fromages?|camembert|brie|comte|emmental|chevre|roquefort|bleu|gouda|mimolette|coulommiers|tomme|reblochon|saint.nectaire|cantal|mozzarella|feta|babybel|vache qui rit', 110, 7, '🧀'],
  ['yaourts?|yogourts?|fromage blanc|faisselle|petits? suisses?|skyr', 80, 6, '🥛'],
  ['crepes?', 250, 6, '🥞'],
  ['fruits?|pommes?|poires?|bananes?|oranges?|kiwis?|clementines?|mandarines?|peches?|nectarines?|abricots?|raisins?|ananas|melon|pasteque|fraises?|cerises?|prunes?|mangues?|framboises?', 70, 1, '🍎'],
  ['pain|baguette|toasts?|tartines?|biscottes?', 80, 3, '🥖'],
  ['vin|champagne|cidre|rose|apero', 100, 0, '🍷'],
  ['bieres?', 140, 1, '🍺'],
  ['sodas?|coca|limonade|orangina|ice tea|sirop', 140, 0, '🥤'],
  ['jus', 90, 1, '🧃'],
  ['cafe|the|tisane|infusion|eau', 0, 0, '☕'],
];

// Valeur prise quand rien n'est reconnu : un plat moyen.
export const UNKNOWN_DISH = { kcal: 350, p: 12, emoji: '🍽️' };

// Ingrédients absents du catalogue : groupe, rayon et valeurs moyennes pour 100 g d'après le nom.
// [mots, groupe, rayon, kcal, prot., gluc., lip., famille de protéine]
export const INGREDIENT_GUESS = [
  ['pommes? de terre|patates?', 'feculent', 'legumes', 80, 2, 17, 0.1],
  ['salades?|laitue|batavia|frisee|scarole|cresson|pousses|feuilles|mesclun|sucrine|romaine|iceberg', 'legume', 'legumes', 15, 1.3, 1.5, 0.2],
  ['choux?|navets?|radis|celeri|fenouil|concombres?|courgettes?|aubergines?|poivrons?|tomates?|haricots? verts?|asperges?|artichauts?|blettes?|potiron|courges?|panais|topinambours?|betteraves?|carottes?|oignons?|echalotes?|poireaux?|champignons?|brocolis?|epinards?|legumes?|germes?|endives?|mache|roquette|petits? pois|mais|cornichons?|olives?', 'legume', 'legumes', 30, 1.5, 4, 0.3],
  ['pommes?|poires?|bananes?|oranges?|clementines?|mandarines?|peches?|nectarines?|abricots?|cerises?|prunes?|figues?|raisins?|melons?|pasteques?|fraises?|framboises?|myrtilles?|cassis|mures?|grenades?|pamplemousses?|citrons?|kiwis?|mangues?|ananas|litchis?|kumquats?|agrumes?|baies?|goyaves?|papayes?|fruits?', 'fruit', 'legumes', 50, 0.6, 11, 0.2],
  ['poissons?|colin|lieu|merlu|dorade|bar|sole|truite|saumon|thon|crevettes?|moules?|calamars?|crabe|saint.jacques|surimi|cabillaud|eglefin|bonite|merlan|limande', 'proteine', 'poisson', 110, 20, 0, 3, 'poisson'],
  ['oeufs?', 'proteine', 'frais', 140, 12.5, 0.7, 9.8, 'oeufs'],
  ['tofu|tempeh|seitan|soja|steak vegetal|proteines? vegetales?', 'proteine', 'frais', 150, 15, 4, 8, 'tofu'],
  ['lentilles?|pois chiches?|haricots? (rouges?|blancs?|secs?|noirs?)|feves?|flageolets?', 'proteine', 'conserves', 120, 8, 16, 0.6, 'legumineuses'],
  ['yaourts?|fromage blanc|skyr|lait|kefir|petits? suisses?', 'laitier', 'frais', 70, 4, 5, 3],
  ['cremes?', 'laitier', 'frais', 200, 2.5, 3, 20],
  ['fromages?|comte|emmental|gruyere|parmesan|mozzarella|feta|chevre|brie|camembert|roquefort|raclette|mascarpone|ricotta|gouda|cheddar|tomme|reblochon|cantal', 'laitier', 'frais', 330, 22, 1, 27, 'laitier'],
  ['riz|pates|spaghettis?|semoule|boulgour|quinoa|ble|epeautre|orge|polenta|nouilles|vermicelles?|farine|flocons?|muesli|cereales?|millet|sarrasin', 'feculent', 'feculents', 350, 11, 70, 2],
  ['pains?|baguettes?|biscottes?|brioches?|tortillas?|galettes?|crackers?|toasts?|croutons?', 'feculent', 'boulangerie', 260, 8, 50, 3],
  ['huiles?|beurre|margarine|graisse', 'gras', 'epicerie', 880, 0, 0, 98],
  ['noix|amandes?|noisettes?|cajou|pistaches?|cacahuetes?|graines?|sesame|tournesol|lin|pignons?', 'gras', 'epicerie', 600, 20, 10, 50],
  ['vinaigrettes?|mayonnaise|sauces?|pesto|tapenade|houmous', 'autre', 'epicerie', 300, 2, 8, 28],
  ['sucres?|miel|sirops?|confitures?|chocolats?|caramel|pate a tartiner', 'autre', 'epicerie', 420, 3, 75, 12],
  ['sel|poivre|epices?|herbes?|persil|basilic|ciboulette|thym|laurier|cumin|curry|paprika|muscade|cannelle|vinaigre|moutarde|bouillon', 'autre', 'epices', 120, 5, 15, 4],
];
export const UNKNOWN_INGREDIENT = { group: 'autre', aisle: 'epicerie', kcal: 100, p: 3, c: 15, f: 3 };

// Quantité habituelle quand elle n'est pas précisée (en grammes, pour les ingrédients comptés en g).
export const DEFAULT_GRAMS = { legume: 100, fruit: 150, proteine: 120, feculent: 60, laitier: 30, gras: 15, autre: 10 };

// Raccourcis de quantité proposés dans « Composer », par groupe (grammes).
export const PRESETS = {
  legume: [['Une poignée', 50], ['Une portion', 150], ['Une grosse portion', 250]],
  fruit: [['Un peu', 80], ['Une portion', 150], ['Beaucoup', 250]],
  proteine: [['Petite part', 80], ['Une part', 120], ['Grosse part', 180]],
  feculent: [['Petite part', 40], ['Une part', 60], ['Grosse part', 90]],
  laitier: [['Un peu', 20], ['Une part', 30], ['Beaucoup', 60]],
  gras: [['Un peu', 5], ['Une cuillère', 10], ['Beaucoup', 20]],
  autre: [['Un peu', 5], ['Une cuillère', 10], ['Beaucoup', 30]],
};

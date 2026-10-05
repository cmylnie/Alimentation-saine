// Plats courants à la cantine et au restaurant, pour estimer un repas pris dehors.
// Valeurs pour une portion « normale », indicatives. Sans viande (poisson oui).

export const DISH_CATS = [
  { id: 'entree', name: 'Entrées' },
  { id: 'plat', name: 'Plats' },
  { id: 'accomp', name: 'Accompagnements' },
  { id: 'fromage', name: 'Fromages, laitages' },
  { id: 'dessert', name: 'Desserts, fruits' },
  { id: 'boisson', name: 'Boissons, pain' },
];

export const SIZES = [
  { id: 'petite', name: 'Petite', k: 0.75 },
  { id: 'normale', name: 'Normale', k: 1 },
  { id: 'grande', name: 'Grande', k: 1.3 },
];

// D(id, nom, catégorie, emoji, kcal, protéines)
const D = (id, name, cat, emoji, kcal, p) => ({ id, name, cat, emoji, kcal, p });

export const DISHES = [
  D('crudites', 'Crudités vinaigrette', 'entree', '🥕', 120, 2),
  D('salade-composee', 'Salade composée (œuf, thon ou fromage)', 'entree', '🥗', 320, 15),
  D('salade-verte', 'Salade verte', 'entree', '🥬', 60, 1),
  D('soupe', 'Soupe, velouté', 'entree', '🥣', 130, 4),
  D('oeuf-mayo', 'Œuf mayonnaise', 'entree', '🥚', 220, 7),
  D('taboule', 'Taboulé, salade de pâtes ou de riz', 'entree', '🥙', 250, 6),
  D('quiche', 'Quiche ou tarte salée (part)', 'entree', '🥧', 350, 11),
  D('poisson-grille', 'Poisson grillé ou vapeur', 'plat', '🐟', 160, 28),
  D('poisson-sauce', 'Poisson en sauce', 'plat', '🐟', 260, 25),
  D('poisson-pane', 'Poisson pané', 'plat', '🐠', 280, 16),
  D('saumon', 'Pavé de saumon', 'plat', '🍣', 320, 30),
  D('crevettes', 'Crevettes, fruits de mer', 'plat', '🦐', 180, 25),
  D('omelette', 'Omelette', 'plat', '🍳', 260, 17),
  D('plat-vege', 'Plat végétarien (gratin, lasagnes, galette)', 'plat', '🥘', 450, 16),
  D('curry-vege', 'Curry, chili ou dahl végétarien', 'plat', '🍛', 400, 16),
  D('pates-poisson', 'Pâtes au saumon ou aux fruits de mer', 'plat', '🍝', 700, 30),
  D('risotto', 'Risotto', 'plat', '🍚', 600, 15),
  D('pizza', 'Pizza (entière)', 'plat', '🍕', 850, 35),
  D('burger-vege', 'Burger végétarien (sans frites)', 'plat', '🍔', 550, 22),
  D('poke', 'Poke bowl saumon ou thon', 'plat', '🥢', 600, 30),
  D('sushis', 'Sushis, makis (8 pièces)', 'plat', '🍣', 330, 14),
  D('galette', 'Galette de sarrasin œuf-fromage', 'plat', '🫓', 450, 22),
  D('feculent', 'Riz, pâtes, semoule ou blé', 'accomp', '🍚', 220, 7),
  D('pdt', 'Pommes de terre vapeur ou purée', 'accomp', '🥔', 180, 4),
  D('frites', 'Frites', 'accomp', '🍟', 380, 5),
  D('legumes', 'Légumes', 'accomp', '🥦', 80, 3),
  D('gratin-legumes', 'Gratin de légumes', 'accomp', '🧀', 200, 8),
  D('legumineuses', 'Lentilles, pois chiches, haricots', 'accomp', '🫘', 180, 11),
  D('fromage', 'Fromage (portion)', 'fromage', '🧀', 110, 7),
  D('yaourt', 'Yaourt nature', 'fromage', '🥛', 70, 5),
  D('yaourt-fruits', 'Yaourt aux fruits ou sucré', 'fromage', '🍓', 120, 5),
  D('fromage-blanc', 'Fromage blanc', 'fromage', '🥛', 100, 9),
  D('fruit', 'Fruit', 'dessert', '🍎', 70, 1),
  D('compote', 'Compote', 'dessert', '🍏', 80, 0),
  D('salade-fruits', 'Salade de fruits', 'dessert', '🍇', 100, 1),
  D('creme-dessert', 'Crème dessert, flan, riz au lait', 'dessert', '🍮', 160, 4),
  D('patisserie', 'Pâtisserie, tarte sucrée', 'dessert', '🍰', 350, 5),
  D('mousse-choc', 'Mousse au chocolat', 'dessert', '🍫', 220, 5),
  D('fondant', 'Fondant ou moelleux au chocolat', 'dessert', '🍫', 420, 6),
  D('glace', 'Glace (2 boules)', 'dessert', '🍨', 200, 3),
  D('crepe', 'Crêpe sucrée', 'dessert', '🥞', 300, 6),
  D('pain', 'Pain (un morceau)', 'boisson', '🥖', 80, 3),
  D('vin', 'Verre de vin', 'boisson', '🍷', 100, 0),
  D('biere', 'Bière (25 cl)', 'boisson', '🍺', 110, 1),
  D('soda', 'Soda (33 cl)', 'boisson', '🥤', 140, 0),
  D('jus', "Jus de fruits (verre)", 'boisson', '🧃', 90, 1),
];

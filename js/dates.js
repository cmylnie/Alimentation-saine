// Dates en chaînes locales "YYYY-MM-DD". Jamais de toISOString() : il passe en UTC et décale d'un jour.

export const pad = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parse(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d || 1);
}

export const todayISO = (now = new Date()) => iso(now);

export function addDays(s, n) {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

// Lundi de la semaine qui contient ce jour.
export function mondayOf(s) {
  const wd = (parse(s).getDay() + 6) % 7;
  return addDays(s, -wd);
}

export const weekDays = monday => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export const JOURS_COURT = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
export const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const wdIndex = s => (parse(s).getDay() + 6) % 7;
export const labelDay = s => `${JOURS[wdIndex(s)]} ${Number(s.slice(8))} ${MOIS_COURT[Number(s.slice(5, 7)) - 1]}`;
export const labelDayShort = s => `${JOURS_COURT[wdIndex(s)]} ${Number(s.slice(8))}`;
export function labelWeek(monday) {
  const end = addDays(monday, 6);
  const a = Number(monday.slice(8)), b = Number(end.slice(8));
  const ma = MOIS_COURT[Number(monday.slice(5, 7)) - 1], mb = MOIS_COURT[Number(end.slice(5, 7)) - 1];
  return ma === mb ? `du ${a} au ${b} ${mb}` : `du ${a} ${ma} au ${b} ${mb}`;
}

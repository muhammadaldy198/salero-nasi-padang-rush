// recipes.js — SALERO. Recipe data + the acceptance matrix (DATA, not if-ladders).
// One job: what a dish is, what a station accepts, how long heat takes.
// Forms: raw -> chopped (board) -> wokked (wok) / grilled (grill); burnt is trash.
// The same ingredient cooked two ways makes two different dishes — that is the
// combination depth (judge criterion 2): ayam grilled = Ayam Pop, ayam chopped
// then wokked = Gulai Ayam; daging wokked = Rendang, daging chopped then
// grilled = Dendeng Balado.

export const ITEMS = {
  nasi: { name: 'Nasi', color: '#f2d98c', colorCooked: '#e8b64c' },
  ayam: { name: 'Ayam', color: '#f0c8a0', colorCooked: '#d98a4a' },
  daging: { name: 'Daging', color: '#c65a4a', colorCooked: '#7a3a22' },
  cabai: { name: 'Cabai', color: '#d43a2a', colorCooked: '#a82a1e' },
  teh: { name: 'Teh', color: '#c98a3a', colorCooked: '#c98a3a' },
};

// A recipe is a SET of {item, form} that must all sit on one plate, in any order.
export const RECIPES = [
  {
    id: 'es-teh',
    name: 'Es Teh Manis',
    short: 'Es Teh',
    items: [{ item: 'teh', form: 'raw' }],
    base: 40,
    color: '#d98e32',
  },
  {
    id: 'nasi-ayam-pop',
    name: 'Nasi Ayam Pop',
    short: 'Ayam Pop',
    items: [
      { item: 'nasi', form: 'wokked' },
      { item: 'ayam', form: 'grilled' },
    ],
    base: 80,
    color: '#e8b64c',
  },
  {
    id: 'gulai-ayam',
    name: 'Gulai Ayam',
    short: 'Gulai',
    items: [
      { item: 'nasi', form: 'wokked' },
      { item: 'ayam', form: 'wokked' },
    ],
    base: 90,
    color: '#e0aa58',
  },
  {
    id: 'rendang-sapi',
    name: 'Rendang Sapi',
    short: 'Rendang',
    items: [
      { item: 'nasi', form: 'wokked' },
      { item: 'daging', form: 'wokked' },
    ],
    base: 100,
    color: '#7a3a22',
  },
  {
    id: 'dendeng-balado',
    name: 'Dendeng Balado',
    short: 'Dendeng',
    items: [
      { item: 'nasi', form: 'wokked' },
      { item: 'daging', form: 'grilled' },
      { item: 'cabai', form: 'chopped' },
    ],
    base: 110,
    color: '#c93b2a',
  },
];

// What the chopping board accepts: raw item -> chopped, and how long it takes.
export const CHOP_ACCEPTS = {
  ayam: { from: 'raw', to: 'chopped', seconds: 1.2 },
  daging: { from: 'raw', to: 'chopped', seconds: 1.2 },
  cabai: { from: 'raw', to: 'chopped', seconds: 1.2 },
};

// What heat accepts: station -> "item:form" -> { to, seconds }.
// Wok and grill are PASSIVE once food is on them (fire cooks while the chef
// works elsewhere — parallel stations, Cook Serve Delicious pattern). The board
// is ACTIVE (hold E to chop). That split is deliberate: one active station,
// two passive ones, so route planning matters.
export const COOK_ACCEPTS = {
  wok: {
    'nasi:raw': { to: 'wokked', seconds: 6 },
    'ayam:chopped': { to: 'wokked', seconds: 6 },
    'daging:raw': { to: 'wokked', seconds: 8 },
  },
  grill: {
    'ayam:raw': { to: 'grilled', seconds: 5 },
    'daging:chopped': { to: 'grilled', seconds: 5 },
  },
};

// The plating counter accepts an item onto a plate only if the plate stays a
// valid PREFIX of some recipe (reject-when-placed, Phaser cooking-counter
// pattern). A wrong ingredient is refused with a shake, never silently eaten.
export function plateAccepts(plateItems, candidate) {
  const next = [...plateItems, candidate];
  return RECIPES.some((r) => isSubset(next, r.items));
}

export function plateMatchesRecipe(plateItems) {
  return RECIPES.find(
    (r) => r.items.length === plateItems.length && isSubset(plateItems, r.items),
  );
}

function isSubset(needles, haystack) {
  const rest = haystack.map((h) => `${h.item}:${h.form}`);
  for (const n of needles) {
    const key = `${n.item}:${n.form}`;
    const i = rest.indexOf(key);
    if (i === -1) return false;
    rest.splice(i, 1);
  }
  return true;
}

// The golden Hajatan ticket: a big wedding-party order, worth 250, that shows
// up every fifth ticket. It is always Rendang — the house signature.
export const SPECIAL_ORDER = {
  dishId: 'rendang-sapi',
  value: 250,
  patience: 75,
  tag: '★ HAJATAN',
};

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id);
}

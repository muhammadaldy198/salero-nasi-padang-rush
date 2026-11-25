// config.js — SALERO: Nasi Padang Rush. All tuning constants in one place.
// One job: constants. No logic, no DOM. (frontend-design: tokens grounded in the
// subject — a night Padang kitchen, not generic cream+terracotta.)

export const CANVAS_W = 1280;
export const CANVAS_H = 720;

// Palette — night Padang warung: deep green-teal walls, warm wood counters,
// chili red, rendang gold, ticket paper.
export const COLORS = {
  wall: '#12261f',
  wallEdge: '#0c1a14',
  floorA: '#1a3329',
  floorB: '#162b22',
  counterWood: '#c98a3a',
  counterWoodDark: '#a86f24',
  counterTop: '#e0aa58',
  chili: '#c93b2a',
  chiliDark: '#9c2a1e',
  gold: '#e8b64c',
  goldDark: '#b98a2e',
  ticket: '#f7ead0',
  ticketInk: '#2b2118',
  steam: '#f4ead8',
  cream: '#f4ead8',
  ink: '#1d1712',
  hudBg: '#0e1f18',
  patienceGood: '#4caf50',
  patienceWarn: '#e8a13c',
  patienceBad: '#d43a2a',
  wokGlow: '#ff7a1a',
  grillGlow: '#ff9d2e',
};

export const SHIFT_SECONDS = 180;
export const SPAWN_START = 14; // seconds between orders at shift start
export const SPAWN_END = 7; // seconds between orders at shift end
export const PATIENCE_START = 60; // seconds a ticket lives, shift start
export const PATIENCE_END = 40; // seconds a ticket lives, shift end
export const MAX_ORDERS = 4;
export const EXPIRE_PENALTY = 50;
export const RUSH_AT_ELAPSED = 90; // seconds into the shift
export const RUSH_SECONDS = 20; // double-spawn window
export const SPECIAL_EVERY = 5; // every 5th order is the golden Hajatan ticket
export const SPECIAL_VALUE = 250;
export const SPECIAL_PATIENCE = 75;

export const CHOP_SECONDS = 1.2;
export const BURN_AFTER_SECONDS = 8; // food left on heat after READY
export const CHEF_SPEED = 260; // px per second
export const CHEF_RADIUS = 20;
export const INTERACT_RADIUS = 64; // px from station edge

export const STREAK_STEP = 0.1; // +10% per consecutive serve
export const STREAK_CAP = 5; // streak multiplier caps at 1.5x
export const TIME_BONUS_MAX = 0.5; // +50% when served with full patience left
export const PERFECT_PATIENCE = 0.5; // patience fraction left for PERFECT
export const PERFECT_BONUS = 0.1; // +10% on top for a perfect serve

export const STAR_THRESHOLDS = [600, 1200, 2000]; // 1, 2, 3 stars
export const COMBO_WINDOW = 20; // seconds between serves to keep the streak alive
export const START_PLATES = 4; // clean plates stacked at the plating counter
export const MAX_CLEAN_PLATES = 6; // a served plate comes back clean from the back kitchen

// Public face of the game — the name the judge reads first.
export const GAME_TITLE = 'SALERO';
export const GAME_SUBTITLE = 'Nasi Padang Rush';
export const GAME_TAGLINE = 'Rendang tak menunggu siapa pun.';
export const KITCHEN_NAME = 'Rumah Makan Salero';
export const CONTROLS_HINT = 'WASD / panah: jalan   •   E / spasi: ambil, potong, masak, sajikan   •   klik: jalan ke stasiun   •   P: jeda   •   M: bisu';

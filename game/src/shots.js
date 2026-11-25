// shots.js — SALERO. Staged screenshot states (REBUILD #3, fresh from brief).
// Rebuild #3 note: staged states verified against shoot.py check_state.
// One job: build deterministic states for the 4 dossier shots. Only fixed
// assignments on top of createState(seed) — no Date.now, no Math.random, so
// every run renders byte-identical frames.
//
// Contract (from main.js): stageShot(shotName, seed) returns a state; the
// screen is derived from state.phase ('title' | 'playing' | 'over').
// Contract (from scripts/shoot.py check_state):
//   play/rush: >=3 orders, a mid-assembly plate (1-2 items) or a carried
//     plate, food on a heat station, timer in range; rush also needs a
//     red-patience ticket (<0.25) and a carried plate.
//   start: phase 'title'.  end: phase 'over' and score > 0.

import { createState } from './sim.js';
import { recipeById } from './recipes.js';

function order(id, dishId, patience, maxPatience, special = false) {
  const dish = recipeById(dishId);
  return {
    id,
    dishId,
    name: dish.name,
    short: dish.short,
    base: dish.base,
    value: special ? 250 : dish.base,
    patience,
    maxPatience,
    special,
    born: 0,
  };
}

export function stageShot(name, seed = 1) {
  const s = createState(seed);

  if (name === 'start') {
    // Title screen: the SALERO hero.
    s.phase = 'title';
    return s;
  }

  if (name === 'play') {
    // Mid-shift: 3 tickets, food on both heat stations, board mid-chop, a
    // complete Ayam Pop + a mid-assembly plate on the plating counter, and
    // the chef mid-frame carrying a dendeng in progress (hero plate).
    s.phase = 'playing';
    s.elapsed = 45;
    s.timeLeft = 135;
    s.score = 320;
    s.streak = 2;
    s.bestStreak = 3;
    s.served = 4;
    s.servedPerfect = 1;
    s.orders = [
      order(1, 'rendang-sapi', 40, 60),
      order(2, 'gulai-ayam', 25, 50),
      order(3, 'nasi-ayam-pop', 55, 60),
    ];
    s.orderCounter = 3;
    s.spawnTimer = 8;
    s.stations.wok = { item: { item: 'daging', form: 'raw' }, progress: 5, duration: 8 };
    s.stations.grill = { item: { item: 'ayam', form: 'raw' }, progress: 3, duration: 5 };
    s.stations.board = { item: { item: 'cabai', form: 'raw' }, progress: 0.6, duration: 1.2 };
    s.plates.onCounter = [
      { items: [{ item: 'nasi', form: 'wokked' }, { item: 'ayam', form: 'grilled' }] },
      { items: [{ item: 'nasi', form: 'wokked' }] },
    ];
    s.plates.cleanStock = 3;
    s.chef = {
      x: 640,
      y: 460,
      dir: 'down',
      moving: false,
      carrying: {
        kind: 'plate',
        items: [{ item: 'nasi', form: 'wokked' }, { item: 'daging', form: 'grilled' }],
      },
    };
    return s;
  }

  if (name === 'rush') {
    // Rush hour: 4 tickets including one red-patience + one golden Hajatan,
    // both heat stations READY, a complete rendang on the counter, and the
    // chef carrying a complete Ayam Pop (hero plate, green ring).
    s.phase = 'playing';
    s.elapsed = 100;
    s.timeLeft = 80;
    s.score = 1450;
    s.streak = 4;
    s.bestStreak = 5;
    s.served = 12;
    s.servedPerfect = 6;
    s.rushActive = true;
    s.rushShown = true;
    s.orders = [
      order(1, 'rendang-sapi', 8, 60),
      order(2, 'dendeng-balado', 30, 50),
      order(3, 'gulai-ayam', 45, 60),
      order(4, 'rendang-sapi', 40, 75, true),
    ];
    s.orderCounter = 4;
    s.spawnTimer = 4;
    s.stations.wok = { item: { item: 'daging', form: 'raw' }, progress: 8, duration: 8 };
    s.stations.grill = { item: { item: 'ayam', form: 'raw' }, progress: 5, duration: 5 };
    s.stations.board = { item: null, progress: 0, duration: 0 };
    s.plates.onCounter = [
      { items: [{ item: 'nasi', form: 'wokked' }, { item: 'daging', form: 'wokked' }] },
      null,
    ];
    s.plates.cleanStock = 2;
    s.chef = {
      x: 640,
      y: 460,
      dir: 'down',
      moving: false,
      carrying: {
        kind: 'plate',
        items: [{ item: 'nasi', form: 'wokked' }, { item: 'ayam', form: 'grilled' }],
      },
    };
    s.events = [{ type: 'rush', text: 'RUSH MAKAN MALAM!', x: 0, y: 0, age: 0 }];
    return s;
  }

  if (name === 'end') {
    // Shift over: final score 1.450 (2 stars), stats line, hero rendang.
    s.phase = 'over';
    s.elapsed = 180;
    s.timeLeft = 0;
    s.score = 1450;
    s.streak = 0;
    s.bestStreak = 5;
    s.served = 18;
    s.servedPerfect = 6;
    s.missed = 2;
    s.burntCount = 1;
    s.orders = [];
    s.orderCounter = 22;
    return s;
  }

  // Unknown shot name: fall back to the title screen.
  s.phase = 'title';
  return s;
}

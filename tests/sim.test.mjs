// sim.test.mjs — SALERO. Node assert unit tests for the pure sim.
// Run: node --test tests/sim.test.mjs  (from the entry root)

import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, nearestStation, spawnOrder, resolveServe } from '../game/src/sim.js';
import { plateAccepts, plateMatchesRecipe } from '../game/src/recipes.js';
import { hashState } from '../game/src/random.js';

function playState() {
  const s = createState(7);
  s.phase = 'playing';
  return s;
}

function noInput() {
  return { up: false, down: false, left: false, right: false, interact: false, interactPressed: false };
}

test('acceptance matrix: plate only takes valid recipe prefixes', () => {
  assert.equal(plateAccepts([], { item: 'nasi', form: 'wokked' }), true);
  assert.equal(plateAccepts([{ item: 'nasi', form: 'wokked' }], { item: 'ayam', form: 'grilled' }), true);
  assert.equal(plateAccepts([{ item: 'nasi', form: 'wokked' }], { item: 'ayam', form: 'wokked' }), true);
  // [nasi wokked, daging grilled] IS a valid prefix — dendeng needs exactly
  // those two plus chopped cabai. A genuinely invalid pair:
  assert.equal(plateAccepts([{ item: 'nasi', form: 'wokked' }, { item: 'ayam', form: 'grilled' }], { item: 'daging', form: 'grilled' }), false);
  assert.equal(plateAccepts([{ item: 'teh', form: 'raw' }], { item: 'nasi', form: 'wokked' }), false);
  assert.equal(plateAccepts([], { item: 'nasi', form: 'raw' }), false);
  assert.equal(plateAccepts([], { item: 'teh', form: 'raw' }), true);
  const r = plateMatchesRecipe([
    { item: 'nasi', form: 'wokked' },
    { item: 'ayam', form: 'grilled' },
  ]);
  assert.equal(r.id, 'nasi-ayam-pop');
  assert.equal(plateMatchesRecipe([{ item: 'nasi', form: 'wokked' }]), undefined);
});

test('chop: hold-to-progress, release freezes, never rolls back', () => {
  const s = playState();
  s.chef.carrying = { kind: 'item', item: 'ayam', form: 'raw' };
  s.chef.x = 418;
  s.chef.y = 242;
  const input = noInput();
  input.interactPressed = true;
  tick(s, input);
  assert.equal(s.chef.carrying, null);
  assert.equal(s.stations.board.item.item, 'ayam');
  const held = { ...noInput(), interact: true };
  for (let i = 0; i < 30; i++) tick(s, held);
  const p1 = s.stations.board.progress;
  assert.ok(p1 > 0.3 && p1 < 1.2, `progress ${p1}`);
  for (let i = 0; i < 30; i++) tick(s, noInput());
  assert.equal(s.stations.board.progress, p1, 'release freezes progress');
  for (let i = 0; i < 60; i++) tick(s, held);
  assert.equal(s.stations.board.item.form, 'chopped');
});

test('wok: raw nasi cooks in 6s, burns 8s after ready', () => {
  const s = playState();
  s.chef.carrying = { kind: 'item', item: 'nasi', form: 'raw' };
  s.chef.x = 418;
  s.chef.y = 376;
  tick(s, { ...noInput(), interactPressed: true });
  assert.equal(s.stations.wok.item.item, 'nasi');
  assert.equal(s.stations.wok.duration, 6);
  for (let i = 0; i < 60 * 6 + 5; i++) tick(s, noInput());
  assert.ok(s.stations.wok.progress >= 6);
  // Taking it early is denied; taking it ready gives wokked nasi.
  for (let i = 0; i < 60 * 8 + 5; i++) tick(s, noInput());
  assert.equal(s.stations.wok.item.form, 'burnt');
  assert.equal(s.burntCount, 1);
});

test('serve: FIFO oldest matching order, wrong dish not consumed', () => {
  const s = playState();
  s.orders.push({
    id: 1, dishId: 'nasi-ayam-pop', name: 'Nasi Ayam Pop', short: 'Ayam Pop',
    base: 80, value: 80, patience: 50, maxPatience: 60, special: false, born: 0,
  });
  s.orders.push({
    id: 2, dishId: 'es-teh', name: 'Es Teh Manis', short: 'Es Teh',
    base: 40, value: 40, patience: 50, maxPatience: 60, special: false, born: 0,
  });
  // Serve es teh while ayam-pop is older: FIFO only matches its own dish.
  const r1 = resolveServe(s, [{ item: 'teh', form: 'raw' }]);
  assert.equal(r1.matched, true);
  assert.equal(s.orders.length, 1);
  assert.equal(s.orders[0].dishId, 'nasi-ayam-pop');
  // A plate that matches no recipe is refused and stays in hand (caller-side).
  const r2 = resolveServe(s, [{ item: 'nasi', form: 'raw' }]);
  assert.equal(r2.matched, false);
  assert.equal(s.orders.length, 1);
});

test('scoring: streak multiplier caps at 1.5x, perfect bonus applies', () => {
  const s = playState();
  s.streak = 5;
  s.orders.push({
    id: 1, dishId: 'rendang-sapi', name: 'Rendang Sapi', short: 'Rendang',
    base: 100, value: 100, patience: 60, maxPatience: 60, special: false, born: 0,
  });
  const r = resolveServe(s, [
    { item: 'nasi', form: 'wokked' },
    { item: 'daging', form: 'wokked' },
  ]);
  assert.equal(r.matched, true);
  // 100 * 1.5 streak * 1.5 time * 1.1 perfect = 247.5 -> 248
  assert.equal(r.points, 248);
  assert.equal(r.perfect, true);
});

test('determinism: same seed + same inputs -> identical state hash', () => {
  function run() {
    const s = playState();
    const script = [
      { ...noInput(), right: true },
      { ...noInput(), right: true, down: true },
      { ...noInput(), interactPressed: true },
    ];
    for (let i = 0; i < 600; i++) tick(s, script[i % 3]);
    const { rng, ...rest } = s;
    return hashState(rest);
  }
  assert.equal(run(), run());
});

test('orders expire: penalty, streak reset, score never negative', () => {
  const s = playState();
  s.score = 20;
  s.streak = 3;
  s.orders.push({
    id: 1, dishId: 'es-teh', name: 'Es Teh Manis', short: 'Es Teh',
    base: 40, value: 40, patience: 0.01, maxPatience: 60, special: false, born: 0,
  });
  tick(s, noInput());
  assert.equal(s.orders.length, 0);
  assert.equal(s.missed, 1);
  assert.equal(s.score, 0);
  assert.equal(s.streak, 0);
});

test('nearest station: chef far from everything gets nothing', () => {
  const s = playState();
  assert.equal(nearestStation(s, 640, 600), null);
  const st = nearestStation(s, 418, 242);
  assert.equal(st.id, 'board');
});

test('rush: double spawn + special order every fifth ticket', () => {
  const s = playState();
  s.elapsed = 95;
  for (let i = 0; i < 4; i++) spawnOrder(s);
  assert.equal(s.orders.filter((o) => o.special).length, 0);
  spawnOrder(s);
  assert.equal(s.orders[4].special, true);
  assert.equal(s.orders[4].value, 250);
  assert.equal(s.orders[4].dishId, 'rendang-sapi');
});

test('serve returns the plate to clean stock — the game never soft-locks', () => {
  const s = playState();
  s.plates.cleanStock = 1;
  s.orders.push({
    id: 1, dishId: 'es-teh', name: 'Es Teh Manis', short: 'Es Teh',
    base: 40, value: 40, patience: 50, maxPatience: 60, special: false, born: 0,
  });
  s.chef.carrying = { kind: 'plate', items: [{ item: 'teh', form: 'raw' }] };
  s.chef.x = 1098;
  s.chef.y = 242;
  tick(s, { ...noInput(), interactPressed: true });
  assert.equal(s.served, 1);
  assert.equal(s.plates.cleanStock, 2);
  assert.equal(s.chef.carrying, null);
});

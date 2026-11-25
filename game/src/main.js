// main.js — SALERO. Boot + game loop + screen state machine + wiring.
// One job: run the game. Fixed-step accumulator (1/60), rAF render, click =
// walk-to (or interact when the chef already stands at that station), audio
// cues driven by sim events, ?shot= static mode for the screenshot shooter.

import { createState, tick, spawnOrder, nearestStation, STATIONS } from './sim.js';
import { render } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 1);

const input = createInput();
input.attach(canvas);
const audio = createAudio();

let state = createState(seed);
let screen = 'title';
let lastEventCount = 0;

// Auto-pause when the tab is hidden mid-shift — the timer never runs while
// the player cannot see it.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'playing') state.paused = true;
});

function startGame() {
  state = createState((Date.now() & 0xffff) || 1);
  state.phase = 'playing';
  spawnOrder(state);
  spawnOrder(state);
  state.spawnTimer = 10;
  screen = 'playing';
  lastEventCount = state.events.length;
  audio.unlock();
}

function watchEvents() {
  const evs = state.events;
  if (evs.length === lastEventCount) return;
  for (let i = lastEventCount; i < evs.length; i++) {
    const e = evs[i];
    if (e.type === 'serve') audio.ding(e.text.includes('PERFECT'));
    else if (e.type === 'denied') audio.error();
    else if (e.type === 'burnt') audio.burn();
    else if (e.type === 'ticket') audio.pop();
    else if (e.type === 'ready') audio.pop();
  }
  lastEventCount = evs.length;
  const cooking = ['wok', 'grill'].some((id) => {
    const st = state.stations[id];
    return st.item && st.progress < st.duration;
  });
  if (cooking) audio.startSizzle();
  else audio.stopSizzle();
}

function stepFrame(raw) {
  const inp = input.poll();
  if (inp.mutePressed) {
    state.muted = !state.muted;
    audio.setMuted(state.muted);
  }
  if (screen === 'title' && (inp.enterPressed || (inp.click && inStartButton(inp.click)))) {
    startGame();
    return;
  }
  if (screen === 'over' && inp.enterPressed) {
    startGame();
    return;
  }
  if (inp.pausePressed && screen === 'playing') {
    state.paused = !state.paused;
  }
  // Mouse: click a station the chef already stands at -> interact with it;
  // otherwise the click is a walk target.
  if (inp.click && screen === 'playing' && !state.paused) {
    const s = nearestStation(state, state.chef.x, state.chef.y);
    const clicked = STATIONS.find(
      (st) => inp.click.x >= st.x - 8 && inp.click.x <= st.x + st.w + 8 && inp.click.y >= st.y - 8 && inp.click.y <= st.y + st.h + 8,
    );
    if (s && clicked && s.id === clicked.id) {
      raw.interactPressed = true;
    } else {
      state.clickTarget = { x: inp.click.x, y: inp.click.y };
    }
  }
  Object.assign(raw, inp);
  if (screen === 'playing') {
    tick(state, raw);
    if (state.phase === 'over') screen = 'over';
  }
  watchEvents();
}

function inStartButton(p) {
  return p.x >= 490 && p.x <= 790 && p.y >= 520 && p.y <= 580;
}

if (shotName) {
  // Static screenshot mode: stage the state, render once, signal readiness.
  state = stageShot(shotName, seed);
  screen = state.phase === 'title' ? 'title' : state.phase === 'over' ? 'over' : 'playing';
  render(ctx, state, screen);
  window.__SALERO_READY__ = true;
  window.__SALERO_STATE__ = state;
} else {
  let last = performance.now();
  let acc = 0;
  const STEP = 1000 / 60;
  const raw = {};
  function frame(now) {
    acc += Math.min(100, now - last);
    last = now;
    while (acc >= STEP) {
      acc -= STEP;
      stepFrame(raw);
    }
    render(ctx, state, screen);
    window.__SALERO_STATE__ = state;
    requestAnimationFrame(frame);
  }
  render(ctx, state, screen);
  requestAnimationFrame(frame);
  window.__SALERO_READY__ = true;
}

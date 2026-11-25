// render.js — SALERO. Pure canvas renderer (REBUILD #3, fresh from brief).
// Rebuild #3, visual pass 2: tray at waist height, HAJATAN tab on the ticket edge.
// One job: draw the state. No sim logic, no DOM reads, no Date.now, no
// Math.random — the same state always renders the same frame (deterministic
// screenshots). Layout lives on one 8px grid; every label sits INSIDE its
// counter and every hint pill lives in a free gap, so text can never collide
// (visual-anti-slop aturan 2/3). The SALERO wordmark is IN the gameplay
// frame (HUD brand block + serve-window sign), not only on the title screen.
// The carried plate hangs at waist height (chef.y+80) so the cook stays
// visible above it — a tray never swallows its bearer.
//
// Contract (from main.js): render(ctx, state, screen) with screen in
// 'title' | 'playing' | 'over'. State shape comes from sim.js.

import {
  CANVAS_W,
  CANVAS_H,
  COLORS,
  GAME_TITLE,
  GAME_SUBTITLE,
  GAME_TAGLINE,
  KITCHEN_NAME,
  CONTROLS_HINT,
  STAR_THRESHOLDS,
} from './config.js';
import { STATIONS, stationStateOf, nearestStation } from './sim.js';
import { ITEMS, plateMatchesRecipe } from './recipes.js';

// ---------------------------------------------------------------- helpers

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function txt(ctx, s, x, y, font, color, align = 'center', baseline = 'alphabetic') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(s, x, y);
}

function fmtNum(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function fmtClock(sec) {
  const t = Math.max(0, Math.ceil(sec));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function pill(ctx, cx, cy, label, font, bg, fg, border = null) {
  ctx.font = font;
  const w = ctx.measureText(label).width + 28;
  const h = 26;
  rr(ctx, cx - w / 2, cy - h / 2, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  if (border) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = border;
    ctx.stroke();
  }
  txt(ctx, label, cx, cy + 5, font, fg);
  return w;
}

// ------------------------------------------------------- literal food icons
// Every item+form is drawn as a literal mini-illustration (a pile of rice
// grains, a drumstick, saucy rendang chunks — never a generic sack or blob).
// All geometry is fixed offsets: no randomness, deterministic.

function drawFoodIcon(ctx, item, form, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  const u = r / 20; // unit: icon radius is 20u
  if (item === 'nasi' && form === 'raw') {
    // A pile of raw rice grains.
    ctx.fillStyle = '#f7f3e3';
    const grains = [[-9, 6, 5, 3], [-2, 8, 5, 3], [6, 7, 5, 3], [-6, 0, 5, 3], [2, 1, 5, 3], [9, 2, 4, 3], [-1, -6, 5, 3], [7, -4, 4, 3]];
    for (const [gx, gy, gw, gh] of grains) {
      ctx.beginPath();
      ctx.ellipse(gx * u, gy * u, gw * u, gh * u, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#d9cfa8';
    ctx.beginPath();
    ctx.ellipse(-4 * u, 9 * u, 4 * u, 2.5 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (item === 'nasi' && form === 'wokked') {
    // Golden fried-rice mound with egg flecks + green garnish.
    ctx.fillStyle = '#e8b64c';
    ctx.beginPath();
    ctx.arc(0, 3 * u, 15 * u, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f7d774';
    ctx.beginPath();
    ctx.arc(-4 * u, -2 * u, 9 * u, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2e3ac';
    for (const [gx, gy] of [[-7, 2], [1, -1], [7, 4]]) {
      ctx.fillRect(gx * u - 1.5 * u, gy * u - 1.5 * u, 3 * u, 3 * u);
    }
    ctx.fillStyle = '#4caf50';
    for (const [gx, gy] of [[-11, 8], [10, 8]]) {
      ctx.beginPath();
      ctx.arc(gx * u, gy * u, 2 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (item === 'ayam' && form === 'raw') {
    // Raw drumstick: pink meat + white bone.
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath();
    ctx.ellipse(-2 * u, 2 * u, 11 * u, 8 * u, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f7f3e3';
    ctx.lineWidth = 4 * u;
    ctx.beginPath();
    ctx.moveTo(6 * u, -4 * u);
    ctx.lineTo(14 * u, -12 * u);
    ctx.stroke();
    ctx.fillStyle = '#f7f3e3';
    ctx.beginPath();
    ctx.arc(15 * u, -13 * u, 4 * u, 0, Math.PI * 2);
    ctx.fill();
  } else if (item === 'ayam' && form === 'chopped') {
    // Three raw pink cubes.
    ctx.fillStyle = '#f0c8a0';
    for (const [gx, gy, s] of [[-9, -4, 9], [4, -8, 8], [-2, 6, 10]]) {
      rr(ctx, gx * u - s * u / 2, gy * u - s * u / 2, s * u, s * u, 2 * u);
      ctx.fill();
    }
    ctx.strokeStyle = '#d98a4a';
    ctx.lineWidth = 1.5 * u;
    for (const [gx, gy, s] of [[-9, -4, 9], [4, -8, 8], [-2, 6, 10]]) {
      rr(ctx, gx * u - s * u / 2, gy * u - s * u / 2, s * u, s * u, 2 * u);
      ctx.stroke();
    }
  } else if (item === 'ayam' && form === 'wokked') {
    // Curry-coated chunks in an orange sauce pool.
    ctx.fillStyle = '#d98a4a';
    ctx.beginPath();
    ctx.ellipse(0, 6 * u, 14 * u, 6 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b64c';
    for (const [gx, gy] of [[-8, -2], [3, -6], [8, 2]]) {
      ctx.beginPath();
      ctx.arc(gx * u, gy * u, 6 * u, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#7a3a22';
    for (const [gx, gy] of [[-5, -4], [6, -8]]) {
      ctx.beginPath();
      ctx.arc(gx * u, gy * u, 1.8 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (item === 'ayam' && form === 'grilled') {
    // Browned drumstick with two char grill stripes.
    ctx.fillStyle = '#b06a2e';
    ctx.beginPath();
    ctx.ellipse(-2 * u, 2 * u, 11 * u, 8 * u, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a2e12';
    ctx.lineWidth = 2.5 * u;
    ctx.beginPath();
    ctx.moveTo(-8 * u, -2 * u);
    ctx.lineTo(2 * u, 8 * u);
    ctx.moveTo(-3 * u, -6 * u);
    ctx.lineTo(7 * u, 4 * u);
    ctx.stroke();
    ctx.strokeStyle = '#f7f3e3';
    ctx.lineWidth = 4 * u;
    ctx.beginPath();
    ctx.moveTo(6 * u, -4 * u);
    ctx.lineTo(14 * u, -12 * u);
    ctx.stroke();
    ctx.fillStyle = '#f7f3e3';
    ctx.beginPath();
    ctx.arc(15 * u, -13 * u, 4 * u, 0, Math.PI * 2);
    ctx.fill();
  } else if (item === 'daging' && form === 'raw') {
    // Two raw red meat cubes.
    ctx.fillStyle = '#c65a4a';
    rr(ctx, -13 * u, -7 * u, 11 * u, 11 * u, 2 * u);
    ctx.fill();
    rr(ctx, 2 * u, 0, 12 * u, 12 * u, 2 * u);
    ctx.fill();
    ctx.fillStyle = '#e08a76';
    ctx.fillRect(-10 * u, -4 * u, 5 * u, 3 * u);
    ctx.fillRect(5 * u, 3 * u, 5 * u, 3 * u);
  } else if (item === 'daging' && form === 'chopped') {
    // Three smaller raw cubes.
    ctx.fillStyle = '#c65a4a';
    for (const [gx, gy, s] of [[-10, -5, 8], [3, -9, 7], [-3, 5, 9]]) {
      rr(ctx, gx * u - s * u / 2, gy * u - s * u / 2, s * u, s * u, 2 * u);
      ctx.fill();
    }
    ctx.fillStyle = '#e08a76';
    ctx.fillRect(-12 * u, -7 * u, 4 * u, 2.5 * u);
    ctx.fillRect(1 * u, 3 * u, 4 * u, 2.5 * u);
  } else if (item === 'daging' && form === 'wokked') {
    // Rendang: dark chunks in a thick sauce pool + chili flecks + garnish.
    ctx.fillStyle = '#5a2a16';
    ctx.beginPath();
    ctx.ellipse(0, 7 * u, 15 * u, 6 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a3a22';
    for (const [gx, gy] of [[-8, -3], [2, -7], [8, 1]]) {
      ctx.beginPath();
      ctx.arc(gx * u, gy * u, 6.5 * u, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#c93b2a';
    for (const [gx, gy] of [[-6, -6], [5, -9], [9, -2]]) {
      ctx.beginPath();
      ctx.arc(gx * u, gy * u, 1.8 * u, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(-12 * u, 8 * u, 2 * u, 0, Math.PI * 2);
    ctx.arc(12 * u, 9 * u, 2 * u, 0, Math.PI * 2);
    ctx.fill();
  } else if (item === 'daging' && form === 'grilled') {
    // Dendeng: three thin dark slices with char lines.
    ctx.fillStyle = '#6b3418';
    for (const [gx, gy, rot] of [[-9, -4, -0.4], [2, -8, 0.3], [0, 6, 0.1]]) {
      ctx.save();
      ctx.translate(gx * u, gy * u);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, 9 * u, 4.5 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = '#3a1c0a';
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.moveTo(-13 * u, -6 * u);
    ctx.lineTo(-5 * u, -2 * u);
    ctx.moveTo(0, -10 * u);
    ctx.lineTo(6 * u, -6 * u);
    ctx.stroke();
    ctx.fillStyle = '#c93b2a';
    ctx.beginPath();
    ctx.arc(10 * u, 6 * u, 2 * u, 0, Math.PI * 2);
    ctx.fill();
  } else if (item === 'cabai' && form === 'raw') {
    // One curved red chili with a green stem.
    ctx.strokeStyle = '#d43a2a';
    ctx.lineWidth = 6 * u;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-12 * u, -8 * u);
    ctx.quadraticCurveTo(2 * u, 10 * u, 14 * u, -2 * u);
    ctx.stroke();
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.moveTo(-12 * u, -8 * u);
    ctx.lineTo(-16 * u, -14 * u);
    ctx.stroke();
  } else if (item === 'cabai' && form === 'chopped') {
    // Three chili rings with seeds.
    ctx.strokeStyle = '#d43a2a';
    ctx.lineWidth = 3.5 * u;
    for (const [gx, gy] of [[-8, -4], [5, -7], [0, 6]]) {
      ctx.beginPath();
      ctx.arc(gx * u, gy * u, 6 * u, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#f7ead0';
    for (const [gx, gy] of [[-8, -4], [5, -7], [0, 6]]) {
      ctx.beginPath();
      ctx.arc(gx * u, gy * u, 1.8 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (item === 'teh') {
    // Glass of iced tea: amber liquid, ice cubes, straw.
    ctx.fillStyle = '#e8e0c8';
    ctx.beginPath();
    ctx.moveTo(-9 * u, -12 * u);
    ctx.lineTo(9 * u, -12 * u);
    ctx.lineTo(6 * u, 12 * u);
    ctx.lineTo(-6 * u, 12 * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d98e32';
    ctx.beginPath();
    ctx.moveTo(-7 * u, -8 * u);
    ctx.lineTo(7 * u, -8 * u);
    ctx.lineTo(5 * u, 10 * u);
    ctx.lineTo(-5 * u, 10 * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f7f3e3';
    ctx.fillRect(-4 * u, -4 * u, 5 * u, 5 * u);
    ctx.fillRect(1 * u, 1 * u, 5 * u, 5 * u);
    ctx.strokeStyle = '#c93b2a';
    ctx.lineWidth = 2.5 * u;
    ctx.beginPath();
    ctx.moveTo(4 * u, -8 * u);
    ctx.lineTo(9 * u, -16 * u);
    ctx.stroke();
  } else if (form === 'burnt') {
    // Charred lump + a wisp of smoke.
    ctx.fillStyle = '#1d1712';
    ctx.beginPath();
    ctx.ellipse(0, 4 * u, 12 * u, 8 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2e22';
    ctx.beginPath();
    ctx.arc(-4 * u, -1 * u, 5 * u, 0, Math.PI * 2);
    ctx.arc(5 * u, 0, 4 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(244,234,216,0.75)';
    ctx.beginPath();
    ctx.arc(-2 * u, -12 * u, 3.5 * u, 0, Math.PI * 2);
    ctx.arc(3 * u, -17 * u, 2.5 * u, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Fallback: a plain colored dot (never reached for known items).
    const c = (ITEMS[item] && ITEMS[item].color) || '#e8b64c';
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(0, 0, 12 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------- composed plate
// A plate shows its items ARRANGED in fixed slots (rice top-left, protein
// top-right, chili bottom-centre) — a composed dish, never a mound. Hero
// plates (d >= 140) get bigger icons, a gold inner ring, a sauce swoosh
// and garnish, so the white never reads as empty.

function drawPlate(ctx, items, cx, cy, d, opts = {}) {
  const r = d / 2;
  const hero = d >= 140;
  // Soft shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath();
  ctx.ellipse(cx + 3, cy + r * 0.92, r * 0.95, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  // Plate body + rim.
  ctx.fillStyle = '#f7f3e3';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9cfa8';
  ctx.lineWidth = Math.max(2, d * 0.02);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2);
  ctx.stroke();
  if (hero) {
    // Gold inner ring + sauce swoosh + garnish, so a big plate never looks empty.
    ctx.strokeStyle = 'rgba(185,138,46,0.55)';
    ctx.lineWidth = Math.max(2, d * 0.015);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(122,58,34,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.18, cy + r * 0.34, r * 0.42, r * 0.12, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4caf50';
    for (const [gx, gy] of [[-0.42, 0.3], [0.45, -0.3], [0.05, 0.5], [-0.1, -0.45]]) {
      ctx.beginPath();
      ctx.arc(cx + gx * d, cy + gy * d, Math.max(2, d * 0.018), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Green ring when the plate is a complete recipe (ready to serve).
  if (opts.ring) {
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = Math.max(4, d * 0.055);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.97, 0, Math.PI * 2);
    ctx.stroke();
    // Check badge on the rim (drawn ON the plate, never floating over text).
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(cx + r * 0.66, cy - r * 0.66, Math.max(10, d * 0.075), 0, Math.PI * 2);
    ctx.fill();
    txt(ctx, '✓', cx + r * 0.66, cy - r * 0.66 + Math.max(4, d * 0.028), `700 ${Math.max(12, d * 0.09)}px system-ui, sans-serif`, '#ffffff');
  }
  // Items in fixed slots.
  const n = items.length;
  let slots;
  if (n >= 3) slots = [[-0.22, -0.16], [0.22, -0.16], [0, 0.22]];
  else if (n === 2) slots = [[-0.2, 0], [0.2, 0]];
  else slots = [[0, 0]];
  const iconR = d * (hero ? 0.23 : n >= 3 ? 0.15 : 0.19);
  for (let i = 0; i < n; i++) {
    const [sx, sy] = slots[i];
    drawFoodIcon(ctx, items[i].item, items[i].form, cx + sx * d, cy + sy * d, iconR);
  }
  if (n === 0) {
    // Empty clean plate: faint dashed inner ring.
    ctx.strokeStyle = 'rgba(29,23,18,0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// --------------------------------------------------------------------- chef
// The cook, 1.5x presence: white hat, red apron, a face with a direction.

function drawChef(ctx, chef) {
  const { x, y, dir } = chef;
  const dx = dir === 'right' ? 1 : dir === 'left' ? -1 : 0;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 42, 30, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Legs.
  ctx.fillStyle = '#2b2118';
  rr(ctx, x - 16, y + 18, 13, 24, 4);
  ctx.fill();
  rr(ctx, x + 3, y + 18, 13, 24, 4);
  ctx.fill();
  // Body (white uniform) + red apron.
  ctx.fillStyle = '#f7f3e3';
  rr(ctx, x - 23, y - 16, 46, 36, 10);
  ctx.fill();
  ctx.fillStyle = '#c93b2a';
  rr(ctx, x - 17, y - 6, 34, 26, 6);
  ctx.fill();
  ctx.fillStyle = '#e8b64c';
  ctx.beginPath();
  ctx.arc(x, y + 2, 4, 0, Math.PI * 2);
  ctx.fill();
  // Arms.
  ctx.strokeStyle = '#f7f3e3';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 20, y - 6);
  ctx.lineTo(x - 30 + dx * 6, y + 12);
  ctx.moveTo(x + 20, y - 6);
  ctx.lineTo(x + 30 + dx * 6, y + 12);
  ctx.stroke();
  // Head + hat.
  ctx.fillStyle = '#f0c8a0';
  ctx.beginPath();
  ctx.arc(x + dx * 3, y - 28, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7f3e3';
  ctx.fillRect(x - 16, y - 48, 32, 10);
  ctx.beginPath();
  ctx.arc(x - 11, y - 50, 10, 0, Math.PI * 2);
  ctx.arc(x, y - 55, 11, 0, Math.PI * 2);
  ctx.arc(x + 11, y - 50, 10, 0, Math.PI * 2);
  ctx.fill();
  // Face.
  ctx.fillStyle = '#1d1712';
  ctx.beginPath();
  ctx.arc(x - 5 + dx * 3, y - 30, 2, 0, Math.PI * 2);
  ctx.arc(x + 5 + dx * 3, y - 30, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1d1712';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + dx * 3, y - 24, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Carried loose item (not a plate): small icon at the hand.
  if (chef.carrying && chef.carrying.kind === 'item') {
    drawFoodIcon(ctx, chef.carrying.item, chef.carrying.form, x + dx * 34, y + 8, 15);
  }
}

// ------------------------------------------------------------------ stations

function labelPill(ctx, st, label) {
  ctx.font = "700 13px system-ui, 'Segoe UI', Arial, sans-serif";
  const w = ctx.measureText(label).width + 20;
  const x = st.x + st.w / 2 - w / 2;
  const y = st.y + 4;
  rr(ctx, x, y, w, 18, 9);
  ctx.fillStyle = '#0e1f18';
  ctx.fill();
  txt(ctx, label, st.x + st.w / 2, y + 13.5, "700 13px system-ui, 'Segoe UI', Arial, sans-serif", COLORS.cream);
}

function counterBase(ctx, st) {
  // Drop shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, st.x + 3, st.y + 5, st.w, st.h, 10);
  ctx.fill();
  // Wood body + lighter top band.
  ctx.fillStyle = COLORS.counterWood;
  rr(ctx, st.x, st.y, st.w, st.h, 10);
  ctx.fill();
  ctx.fillStyle = COLORS.counterTop;
  rr(ctx, st.x + 2, st.y + 2, st.w - 4, 14, 7);
  ctx.fill();
  ctx.strokeStyle = COLORS.counterWoodDark;
  ctx.lineWidth = 3;
  rr(ctx, st.x, st.y, st.w, st.h, 10);
  ctx.stroke();
}

function progressRing(ctx, cx, cy, r, frac, color) {
  ctx.strokeStyle = 'rgba(29,23,18,0.25)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  if (frac > 0) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac));
    ctx.stroke();
  }
}

function statePill(ctx, st, label, bg, fg) {
  // Right side of the counter, vertically centred — the label pill lives at
  // the TOP and the food icon at centre-left, so this can never touch either.
  const w = 88;
  const h = 28;
  const x = st.x + st.w - w - 8;
  const y = st.y + st.h / 2 - h / 2;
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  txt(ctx, label, x + w / 2, y + 19, "700 14px system-ui, 'Segoe UI', Arial, sans-serif", fg);
}

function flames(ctx, cx, yBase) {
  // Small flames peeking out BELOW the counter's bottom edge (fire under the
  // wok/grill). They end at yBase+10; the hint pill starts at yBase+16.
  ctx.fillStyle = COLORS.wokGlow;
  for (const [fx, fh] of [[-16, 10], [0, 13], [16, 10]]) {
    ctx.beginPath();
    ctx.moveTo(cx + fx - 6, yBase + 10);
    ctx.quadraticCurveTo(cx + fx - 4, yBase - fh, cx + fx, yBase - fh - 3);
    ctx.quadraticCurveTo(cx + fx + 4, yBase - fh, cx + fx + 6, yBase + 10);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(cx - 4, yBase + 10);
  ctx.quadraticCurveTo(cx - 2, yBase - 4, cx, yBase - 7);
  ctx.quadraticCurveTo(cx + 2, yBase - 4, cx + 4, yBase + 10);
  ctx.closePath();
  ctx.fill();
}

function drawStation(ctx, state, st) {
  const sst = state.stations[st.id];
  counterBase(ctx, st);
  labelPill(ctx, st, st.label);

  if (st.kind === 'pantry') {
    // Big literal ingredient icon, centred below the label.
    drawFoodIcon(ctx, st.item, 'raw', st.x + st.w / 2, st.y + 50, 21);
    return;
  }
  if (st.kind === 'trash') {
    ctx.fillStyle = '#3a2e22';
    rr(ctx, st.x + st.w / 2 - 20, st.y + 32, 40, 44, 6);
    ctx.fill();
    ctx.fillStyle = '#2b2118';
    rr(ctx, st.x + st.w / 2 - 24, st.y + 26, 48, 10, 5);
    ctx.fill();
    txt(ctx, '×', st.x + st.w / 2, st.y + 62, "700 26px system-ui, sans-serif", COLORS.cream);
    return;
  }
  if (st.kind === 'serve') {
    // Serving hatch: dark opening with a warm glow + the SALERO sign inside.
    ctx.fillStyle = '#0c1a14';
    rr(ctx, st.x + 96, st.y + 30, 200, 44, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(232,182,76,0.16)';
    rr(ctx, st.x + 96, st.y + 30, 200, 44, 8);
    ctx.fill();
    txt(ctx, 'SALERO', st.x + 196, st.y + 59, "700 16px system-ui, 'Segoe UI', Arial, sans-serif", COLORS.gold);
    // Service bell, left of the hatch.
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(st.x + 52, st.y + 56, 16, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(st.x + 36, st.y + 56, 32, 5);
    ctx.fillStyle = COLORS.chili;
    ctx.beginPath();
    ctx.arc(st.x + 52, st.y + 40, 4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (st.kind === 'plating') {
    // Two plate slots on the counter (d=76 each, composed food).
    const slots = [
      { x: st.x + 75, y: st.y + 52 },
      { x: st.x + 185, y: st.y + 52 },
    ];
    for (let i = 0; i < 2; i++) {
      const p = state.plates.onCounter[i];
      const { x, y } = slots[i];
      if (p) {
        const complete = !!plateMatchesRecipe(p.items);
        drawPlate(ctx, p.items, x, y, 76, { ring: complete });
      } else {
        ctx.strokeStyle = 'rgba(29,23,18,0.30)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(x, y, 34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        txt(ctx, '+', x, y + 9, "700 22px system-ui, sans-serif", 'rgba(29,23,18,0.45)');
      }
    }
    return;
  }
  // board / wok / grill: food icon centre-left + progress ring + state pill.
  const iconX = st.x + 46;
  const iconY = st.y + 54;
  if (sst.item) {
    const stt = stationStateOf(sst, sst.item);
    drawFoodIcon(ctx, sst.item.item, sst.item.form, iconX, iconY, 20);
    if (stt === 'burnt') {
      progressRing(ctx, iconX, iconY, 26, 1, COLORS.patienceBad);
      statePill(ctx, st, 'GOSONG!', COLORS.patienceBad, '#ffffff');
    } else if (stt === 'ready') {
      progressRing(ctx, iconX, iconY, 26, 1, COLORS.patienceGood);
      statePill(ctx, st, '✓ SIAP!', COLORS.patienceGood, '#ffffff');
    } else if (stt === 'working') {
      const frac = sst.duration > 0 ? sst.progress / sst.duration : 0;
      const left = Math.max(0, Math.ceil(sst.duration - sst.progress));
      progressRing(ctx, iconX, iconY, 26, frac, COLORS.gold);
      statePill(ctx, st, `${left} dtk`, COLORS.gold, COLORS.ink);
    }
    if ((st.kind === 'wok' || st.kind === 'grill') && stt !== 'idle') {
      flames(ctx, iconX, st.y + st.h);
    }
  }
  // Idle heat station: nothing on it — the empty counter speaks for itself.
}

// ------------------------------------------------------------ hint pill
// ONE contextual pill at a time, for the station the chef stands nearest.
// Its slot is chosen per station kind so it can never overlap a label, a
// ring, a flame, or another pill: BELOW the counter for board/wok/grill/
// plating/serve/trash/teh-stand (gap ≥ 48px), RIGHT of the counter for the
// pantry column (gap to the next counter is only 16px).

function hintText(state, st) {
  const sst = state.stations[st.id];
  const carrying = state.chef.carrying;
  if (st.kind === 'pantry') {
    return carrying ? null : `AMBIL ${st.label}`;
  }
  if (st.kind === 'board') {
    if (!sst.item) return carrying ? 'TARUH DI TALENAN' : null;
    return sst.item.form === 'raw' ? 'TAHAN E — POTONG' : 'AMBIL POTONGAN';
  }
  if (st.kind === 'wok' || st.kind === 'grill') {
    const verb = st.kind === 'wok' ? 'MASAK' : 'PANGGANG';
    if (!sst.item) return carrying ? `${verb} DI SINI` : null;
    const stt = stationStateOf(sst, sst.item);
    if (stt === 'burnt') return 'BUANG YANG GOSONG';
    if (stt === 'ready') return st.kind === 'wok' ? 'AMBIL MASAKAN' : 'AMBIL PANGGANGAN';
    return 'MASAK… TUNGGU';
  }
  if (st.kind === 'plating') {
    if (carrying && carrying.kind === 'plate') return 'TARUH PIRING';
    if (carrying) return 'TATA DI SINI';
    const full = state.plates.onCounter.find((p) => p && p.items.length > 0);
    return full ? 'AMBIL PIRING' : 'AMBIL PIRING BERSIH';
  }
  if (st.kind === 'serve') {
    return carrying && carrying.kind === 'plate' ? 'ANTAR DI SINI' : null;
  }
  if (st.kind === 'trash') {
    return carrying ? 'BUANG DI SINI' : null;
  }
  return null;
}

function drawHintPill(ctx, state) {
  if (state.phase !== 'playing' || state.paused) return;
  const near = nearestStation(state, state.chef.x, state.chef.y);
  if (!near) return;
  const label = hintText(state, near);
  if (!label) return;
  const text = `▶ ${label}`;
  ctx.font = "700 14px system-ui, 'Segoe UI', Arial, sans-serif";
  const w = ctx.measureText(text).width + 30;
  const h = 26;
  let x;
  let y;
  if (near.kind === 'pantry') {
    x = near.x + near.w + 8;
    y = near.y + near.h / 2 - h / 2;
  } else {
    x = near.x + near.w / 2 - w / 2;
    y = near.y + near.h + 16;
  }
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = '#1d1712';
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.gold;
  rr(ctx, x, y, w, h, h / 2);
  ctx.stroke();
  txt(ctx, text, x + w / 2, y + 18, "700 14px system-ui, 'Segoe UI', Arial, sans-serif", COLORS.cream);
}

// --------------------------------------------------------------------- HUD
// Top strip (0..64): SALERO wordmark left, timer centre, score right.
// Ticket rail (64..168): up to 4 order tickets on one grid. Wall border
// (168..180) separates HUD from floor.

function drawHUD(ctx, state) {
  // Top strip.
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, CANVAS_W, 64);
  // Brand: the SALERO wordmark, in the gameplay frame.
  txt(ctx, '★ SALERO', 24, 42, "700 36px system-ui, 'Segoe UI', Arial, sans-serif", COLORS.gold, 'left');
  txt(ctx, 'RUMAH MAKAN SALERO', 26, 60, "700 12px system-ui, 'Segoe UI', Arial, sans-serif", COLORS.cream, 'left');
  // Timer.
  const rush = state.rushActive;
  txt(ctx, fmtClock(state.timeLeft), CANVAS_W / 2, 42, `700 38px system-ui, 'Segoe UI', Arial, sans-serif`, rush ? '#ff6b5e' : COLORS.cream);
  txt(ctx, rush ? '🔥 RUSH MAKAN MALAM!' : 'SISA SHIFT', CANVAS_W / 2, 60, "700 12px system-ui, 'Segoe UI', Arial, sans-serif", rush ? '#ff6b5e' : '#9ab8a6');
  // Score + streak + clean plates.
  txt(ctx, `SKOR ${fmtNum(state.score)}`, CANVAS_W - 24, 40, "700 28px system-ui, 'Segoe UI', Arial, sans-serif", COLORS.cream, 'right');
  const mult = (1 + 0.1 * Math.min(state.streak, 5)).toFixed(1);
  txt(
    ctx,
    `STREAK ×${mult} (${state.streak}) • PIRING ${state.plates.cleanStock}`,
    CANVAS_W - 24,
    58,
    "700 12px system-ui, 'Segoe UI', Arial, sans-serif",
    '#9ab8a6',
    'right',
  );
  // Ticket rail.
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 64, CANVAS_W, 104);
  const tw = 296;
  const th = 96;
  const gap = 16;
  for (let i = 0; i < state.orders.length; i++) {
    const o = state.orders[i];
    const x = 24 + i * (tw + gap);
    const y = 72;
    const frac = o.maxPatience > 0 ? o.patience / o.maxPatience : 0;
    // Ticket paper + shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    rr(ctx, x + 3, y + 4, tw, th, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.ticket;
    rr(ctx, x, y, tw, th, 8);
    ctx.fill();
    if (o.special) {
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 3;
      rr(ctx, x, y, tw, th, 8);
      ctx.stroke();
      // Golden HAJATAN tab straddling the ticket's top edge — never on the
      // name line, so it can never collide with the dish name or the value.
      ctx.fillStyle = COLORS.gold;
      rr(ctx, x + tw / 2 - 52, y - 10, 104, 20, 10);
      ctx.fill();
      txt(ctx, '★ HAJATAN', x + tw / 2, y + 5, "700 11px system-ui, 'Segoe UI', Arial, sans-serif", COLORS.ink);
    } else if (frac < 0.25) {
      ctx.strokeStyle = COLORS.patienceBad;
      ctx.lineWidth = 3;
      rr(ctx, x, y, tw, th, 8);
      ctx.stroke();
    }
    // Name + value (short value, so the two can never meet mid-ticket).
    txt(ctx, `#${o.id}  ${o.name}`, x + 14, y + 28, "700 17px system-ui, 'Segoe UI', Arial, sans-serif", COLORS.ticketInk, 'left');
    const val = `Rp${o.value}`;
    txt(ctx, val, x + tw - 14, y + 28, "700 15px system-ui, 'Segoe UI', Arial, sans-serif", o.special ? COLORS.goldDark : COLORS.ticketInk, 'right');
    // Patience bar.
    const barX = x + 14;
    const barY = y + 52;
    const barW = tw - 28;
    ctx.fillStyle = 'rgba(29,23,18,0.20)';
    rr(ctx, barX, barY, barW, 12, 6);
    ctx.fill();
    const barColor = frac > 0.5 ? COLORS.patienceGood : frac > 0.25 ? COLORS.patienceWarn : COLORS.patienceBad;
    ctx.fillStyle = barColor;
    rr(ctx, barX, barY, Math.max(12, barW * frac), 12, 6);
    ctx.fill();
    txt(ctx, `${Math.max(0, Math.ceil(o.patience))} dtk`, x + 14, y + 86, "700 13px system-ui, 'Segoe UI', Arial, sans-serif", frac < 0.25 ? COLORS.patienceBad : COLORS.ticketInk, 'left');
    txt(ctx, o.short, x + tw - 14, y + 86, "700 13px system-ui, 'Segoe UI', Arial, sans-serif", '#8a7a5e', 'right');
  }
  // Wall border.
  ctx.fillStyle = COLORS.wallEdge;
  ctx.fillRect(0, 168, CANVAS_W, 12);
  ctx.fillStyle = COLORS.goldDark;
  ctx.fillRect(0, 178, CANVAS_W, 2);
}

// -------------------------------------------------------------------- floor

function drawFloor(ctx) {
  // Checker tiles.
  const t = 40;
  for (let y = 180; y < CANVAS_H; y += t) {
    for (let x = 0; x < CANVAS_W; x += t) {
      const odd = ((x / t) | 0) + ((y / t) | 0);
      ctx.fillStyle = odd % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x, y, t, t);
    }
  }
  // Woven runner along the bottom walkway.
  ctx.fillStyle = '#6b4a26';
  ctx.fillRect(200, 620, 880, 58);
  ctx.fillStyle = '#7d5a30';
  for (let x = 200; x < 1080; x += 44) ctx.fillRect(x, 620, 22, 58);
  ctx.fillStyle = COLORS.goldDark;
  ctx.fillRect(200, 620, 880, 4);
  ctx.fillRect(200, 674, 880, 4);
  // Star inlay on the floor.
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  const sx = 640;
  const sy = 704;
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 - Math.PI / 2;
    const rad = i % 2 === 0 ? 11 : 4.5;
    const px = sx + Math.cos(ang) * rad;
    const py = sy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  // Potted plant, bottom-left.
  ctx.fillStyle = '#a85a32';
  ctx.beginPath();
  ctx.moveTo(48, 668);
  ctx.lineTo(92, 668);
  ctx.lineTo(86, 700);
  ctx.lineTo(54, 700);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3d7a44';
  for (const [lx, ly, rx] of [[58, 648, 9], [70, 636, 11], [82, 648, 9]]) {
    ctx.beginPath();
    ctx.ellipse(lx, ly, rx, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Crate stack, bottom-right.
  ctx.fillStyle = '#8a6a3a';
  ctx.fillRect(1140, 648, 56, 52);
  ctx.fillStyle = '#a8814a';
  ctx.fillRect(1148, 612, 48, 36);
  ctx.strokeStyle = '#6b4a26';
  ctx.lineWidth = 2;
  ctx.strokeRect(1140, 648, 56, 52);
  ctx.strokeRect(1148, 612, 48, 36);
}

// ------------------------------------------------------------------- screens

function drawPlaying(ctx, state) {
  drawFloor(ctx);
  for (const st of STATIONS) drawStation(ctx, state, st);
  drawChef(ctx, state.chef);
  // Carried plate: the hero dish, d=150, held at waist height in front of
  // the chef (chef.y+80, clamped inside the frame) — the biggest element
  // in the frame, with a green ring + check badge when the recipe is
  // complete. The cook's head and chest stay visible above the tray.
  const carrying = state.chef.carrying;
  if (carrying && carrying.kind === 'plate') {
    const complete = !!plateMatchesRecipe(carrying.items);
    const plateD = 150;
    const px = Math.min(Math.max(state.chef.x, plateD / 2 + 4), CANVAS_W - plateD / 2 - 4);
    const py = Math.min(state.chef.y + 80, CANVAS_H - plateD / 2 - 4);
    drawPlate(ctx, carrying.items, px, py, plateD, { ring: complete });
  }
  drawHintPill(ctx, state);
  // Denied feedback, floating above the chef.
  if (state.denied) {
    pill(ctx, state.chef.x, state.chef.y - 78, state.denied, "700 14px system-ui, 'Segoe UI', Arial, sans-serif", COLORS.patienceBad, '#ffffff');
  }
  drawHUD(ctx, state);
  if (state.paused) {
    ctx.fillStyle = 'rgba(12,26,20,0.72)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    txt(ctx, 'JEDA', CANVAS_W / 2, 340, "700 64px system-ui, 'Segoe UI', Arial, sans-serif", COLORS.cream);
    txt(ctx, 'tekan P untuk lanjut', CANVAS_W / 2, 390, "700 20px system-ui, 'Segoe UI', Arial, sans-serif", '#9ab8a6');
  }
  if (state.muted) {
    pill(ctx, CANVAS_W - 70, CANVAS_H - 24, '🔇 BISU', "700 12px system-ui, 'Segoe UI', Arial, sans-serif", '#1d1712', COLORS.cream);
  }
}

function drawTitle(ctx, state) {
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // Decorative floor strip at the bottom.
  ctx.fillStyle = COLORS.floorA;
  ctx.fillRect(0, 640, CANVAS_W, 80);
  ctx.fillStyle = COLORS.floorB;
  for (let x = 0; x < CANVAS_W; x += 80) ctx.fillRect(x, 640, 40, 80);
  // Two composed showcase plates flanking the title.
  drawPlate(ctx, [{ item: 'nasi', form: 'wokked' }, { item: 'daging', form: 'wokked' }], 215, 400, 170, { ring: true });
  drawPlate(ctx, [{ item: 'nasi', form: 'wokked' }, { item: 'ayam', form: 'grilled' }], 1065, 400, 170, { ring: true });
  drawFoodIcon(ctx, 'teh', 'raw', 1065, 300, 26);
  drawFoodIcon(ctx, 'cabai', 'raw', 215, 300, 26);
  // Kitchen name, title, subtitle, tagline.
  txt(ctx, '★ RUMAH MAKAN SALERO ★', CANVAS_W / 2, 92, "700 16px system-ui, 'Segoe UI', Arial, sans-serif", COLORS.gold);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 5;
  txt(ctx, GAME_TITLE, CANVAS_W / 2, 218, "700 118px system-ui, 'Segoe UI', Arial, sans-serif", COLORS.gold);
  ctx.restore();
  txt(ctx, GAME_SUBTITLE, CANVAS_W / 2, 268, "700 32px system-ui, 'Segoe UI', Arial, sans-serif", COLORS.cream);
  txt(ctx, GAME_TAGLINE, CANVAS_W / 2, 312, "italic 20px system-ui, 'Segoe UI', Arial, sans-serif", '#c8d8c8');
  // Start button — coordinates MUST match main.js inStartButton (490..790, 520..580).
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, 494, 526, 300, 60, 14);
  ctx.fill();
  ctx.fillStyle = COLORS.gold;
  rr(ctx, 490, 520, 300, 60, 14);
  ctx.fill();
  txt(ctx, 'MULAI SHIFT ▶', 640, 558, "700 26px system-ui, 'Segoe UI', Arial, sans-serif", COLORS.ink);
  // Controls + info.
  txt(ctx, CONTROLS_HINT, CANVAS_W / 2, 622, "700 15px system-ui, 'Segoe UI', Arial, sans-serif", '#9ab8a6');
  txt(ctx, '180 DETIK • 5 MASAKAN • TIKET HAJATAN Rp250 SETIAP 5 PESANAN', CANVAS_W / 2, 656, "700 13px system-ui, 'Segoe UI', Arial, sans-serif", '#7d9a86');
}

function drawOver(ctx, state) {
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = COLORS.floorA;
  ctx.fillRect(0, 640, CANVAS_W, 80);
  txt(ctx, 'SHIFT SELESAI!', CANVAS_W / 2, 168, "700 60px system-ui, 'Segoe UI', Arial, sans-serif", COLORS.gold);
  txt(ctx, 'SKOR AKHIR', CANVAS_W / 2, 238, "700 16px system-ui, 'Segoe UI', Arial, sans-serif", '#9ab8a6');
  txt(ctx, fmtNum(state.score), CANVAS_W / 2, 330, "700 84px system-ui, 'Segoe UI', Arial, sans-serif", COLORS.cream);
  const stars = state.score >= STAR_THRESHOLDS[2] ? 3 : state.score >= STAR_THRESHOLDS[1] ? 2 : state.score >= STAR_THRESHOLDS[0] ? 1 : 0;
  let starLine = '';
  for (let i = 0; i < 3; i++) starLine += i < stars ? '★' : '☆';
  txt(ctx, starLine, CANVAS_W / 2, 412, "700 54px system-ui, 'Segoe UI', Arial, sans-serif", COLORS.gold);
  txt(
    ctx,
    `DISAJIKAN ${state.served}  •  PERFECT ${state.servedPerfect}  •  HANGUS ${state.missed}  •  STREAK TERBAIK ${state.bestStreak}`,
    CANVAS_W / 2,
    478,
    "700 19px system-ui, 'Segoe UI', Arial, sans-serif",
    COLORS.cream,
  );
  txt(ctx, 'Tekan Enter untuk main lagi', CANVAS_W / 2, 536, "700 17px system-ui, 'Segoe UI', Arial, sans-serif", '#9ab8a6');
  drawPlate(ctx, [{ item: 'nasi', form: 'wokked' }, { item: 'daging', form: 'wokked' }], CANVAS_W / 2, 648, 104, { ring: true });
}

// -------------------------------------------------------------------- export

export function render(ctx, state, screen) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  if (screen === 'title') drawTitle(ctx, state);
  else if (screen === 'over') drawOver(ctx, state);
  else drawPlaying(ctx, state);
}

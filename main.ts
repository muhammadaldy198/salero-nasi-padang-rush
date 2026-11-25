// main.ts — SALERO: Nasi Padang Rush. Entrypoint (Node 22, stdlib only).
// Hands the game in: copies game/ and screenshots/ beside this file into
// /output (or MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the kit's vendored buildDossier library.
// The game is plain static files; the browser loads nothing from the network.

import { cpSync, existsSync, mkdirSync, writeFileSync, chmodSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
}

const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// The dossier is the file the judge reads: leave it world-readable. The mode
// change is best-effort only — in the grader the output directory may belong
// to another user, and a failed chmod must never fail the hand-in (the
// best-card-game v1 entry died on an EPERM from an unconditional chmod).
try {
  chmodSync(dossierPath, 0o644);
} catch {
  // Best effort only; the bytes are already written.
}

// Refuse a hand-in the scorer would refuse, before it leaves this machine.
const shots = existsSync(shotsDir) ? readdirSync(shotsDir) : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`expected 3-4 screenshots, found ${shots.length}`);
}
for (const f of shots) {
  const size = statSync(join(shotsDir, f)).size;
  if (size > 262144) throw new Error(`screenshot ${f} is ${size} bytes, over the 256 KiB cap`);
}

// A short run summary on stdout — the grader keeps it, the bytes stay clean.
function countFiles(dir) {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    n += e.isDirectory() ? countFiles(join(dir, e.name)) : 1;
  }
  return n;
}
console.log(
  `SALERO handed in: ${countFiles(gameDir)} game files, ${shots.length} screenshots, dossier ${statSync(dossierPath).size} bytes`,
);

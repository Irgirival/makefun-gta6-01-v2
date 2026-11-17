// Solmar City v2 — Mara Solano: a complete 3D open-world crime game for the
// make.fun gta6-01 bounty (Node 22, standard library only). v2 expands the
// v1 city with a police helicopter that hunts Mara at 4-5 stars, a full
// day/night cycle with streetlights and car headlights, the Solmar Airfield
// district (runway, terminal, tower, hangars, parked planes), a rideable
// motorcycle, rain weather with wet-road grip loss, a sixth story mission
// ("The Long Runway"), courier runs, stunt-jump ramps, city buses and a
// more varied crowd — joggers, tourists, elders and friends in pairs.
//
// The game lives in this directory's game/ folder as plain static files a
// desktop browser loads fully offline: game/index.html plus its ES modules
// under game/src/, with three.js vendored as a single minified module under
// game/vendor/. No build step, no network request at runtime — every script,
// image and sound the page needs is a file under game/ (sounds are WebAudio
// synthesis, so there are no audio files at all).
//
// What the player gets: a procedural sun-soaked city ("Solmar City") with a
// beach, harbor, parks, a central plaza and the new airfield; Mara Solano on
// foot (WASD + mouse-look, jump, sprint) and behind the wheel (six vehicle
// types plus the Comet 900 motorcycle, arcade physics, car stealing with E);
// traffic AI, buses and pedestrians; a 0-5 star wanted system with pursuing
// cruisers, a searchlight helicopter, roadblocks and arrests; punch and
// pistol combat; six story missions with dialogue, waypoints and cash
// rewards, a repeatable taxi job, courier runs, stunt jumps and twelve hidden
// packages; a HUD with health/armor, cash, wanted stars, clock, weather and
// a canvas minimap; title, pause, busted/wasted and mission-complete
// screens; and localStorage saves.
//
// This program hands the entry in: it copies game/ and screenshots/ from
// beside this file to /output and writes /output/dossier.json, the summary
// the judge reads, with the vendored make.fun library (buildDossier).
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program is deterministic: given the same repository it writes the same
// bytes every run, because it only copies files and builds the dossier from
// them — no timestamps, no randomness, no network. Before handing in, check
// the entry with the kit's own gate first (`makefun check`), so a bad local
// run fails loudly instead of handing in an entry the scorer would refuse.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps, mirrored from the kit's gate: the entry is refused when
// game/ holds more than 993 files or 48 MiB, a screenshot is over 256 KiB,
// there are more than 4 screenshots, or a path under game/ is over 1000
// bytes. Check them here first so a bad local run fails loudly instead of
// handing in an entry the scorer would refuse.
const GAME_MAX_FILES = 993;
const GAME_MAX_BYTES = 50331648;
const GAME_PATH_MAX_BYTES = 1000;
const SHOT_MAX = 4;
const SHOT_MAX_BYTES = 262144;

function countGameFiles(dir, rel = '') {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const childRel = rel ? `${rel}/${name}` : name;
    if (Buffer.byteLength(childRel, 'utf8') > GAME_PATH_MAX_BYTES) {
      throw new Error(`game path too long: ${childRel}`);
    }
    const st = statSync(join(dir, name));
    if (st.isDirectory()) {
      const sub = countGameFiles(join(dir, name), childRel);
      files += sub.files;
      bytes += sub.bytes;
    } else if (st.isFile()) {
      files += 1;
      bytes += st.size;
    }
  }
  return { files, bytes };
}

const gameStats = countGameFiles(join(here, 'game'));
if (gameStats.files > GAME_MAX_FILES) {
  throw new Error(`game/ has ${gameStats.files} files, over the ${GAME_MAX_FILES} cap`);
}
if (gameStats.bytes > GAME_MAX_BYTES) {
  throw new Error(`game/ is ${gameStats.bytes} bytes, over the ${GAME_MAX_BYTES} cap`);
}

const shotsDir = join(here, 'screenshots');
if (existsSync(shotsDir)) {
  const shots = readdirSync(shotsDir).filter((n) => !n.startsWith('.'));
  if (shots.length > SHOT_MAX) throw new Error(`${shots.length} screenshots, over the ${SHOT_MAX} cap`);
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > SHOT_MAX_BYTES) throw new Error(`screenshot ${name} is ${size} bytes, over the ${SHOT_MAX_BYTES} cap`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The dossier text is capped at 160 KiB by buildDossier; the rest of the
// caps only refuse an entry the scorer would refuse.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: SHOT_MAX, max_bytes: SHOT_MAX_BYTES },
    game_max_files: GAME_MAX_FILES,
    game_max_bytes: GAME_MAX_BYTES,
    game_path_max_bytes: GAME_PATH_MAX_BYTES,
  }),
);

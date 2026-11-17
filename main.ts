// Emberfall Keep — the entry program (Node 22, standard library only).
//
// The game itself is plain static files under game/ (index.html plus ES
// modules, no library, no network request). This program hands it in: it
// copies game/ and screenshots/ from beside this file into the output
// directory and writes dossier.json there, the summary the judge reads,
// built with the vendored make.fun library.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The game first, then its screenshots, then the dossier that describes them.
mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The caps are the gate's own: the dossier text is capped at 160 KiB, at
// most 4 screenshots of at most 256 KiB each, and game/ stays under its
// file-count and byte caps. buildDossier refuses an entry that breaks one.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// A missing game/ would be a silent empty entry; fail loudly instead.
// The run is deterministic: the same repository always writes the same bytes.
if (!existsSync(join(outDir, 'game', 'index.html'))) {
  throw new Error('main.ts: game/index.html is missing from the output');
}

// Entry program for makefun-frontend-01 (Node 22, standard library only).
//
// The entry is the static frontend in app/ — plain files a browser opens at
// app/index.html (ES modules and CSS, no build step) reading make.fun's public API —
// plus 3 screenshots of it running on live data in screenshots/. This program hands
// them in: it copies app/ and screenshots/ to /output and writes /output/dossier.json
// with buildDossier from vendor/makefun-frontend.ts, the kit's library, copied
// unchanged (the scorer rebuilds the dossier with its own copy and compares bytes).
//
// Run it locally with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app itself with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(root, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(root, 'screenshots'))) {
  cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps are the scorer's own (reference/gate.json): past them the scorer refuses
// the entry, so refuse here first with the same numbers.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 3, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 16777216,
  }),
);

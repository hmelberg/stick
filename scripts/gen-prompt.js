#!/usr/bin/env node
/* Regenerate netlify/edge-functions/_lib/stick-prompt.ts from PROMPT.md.
   Run after every PROMPT.md edit:  node scripts/gen-prompt.js
   `--check` exits 1 if the generated file is out of date (used by the smoke test). */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = path.join(root, 'PROMPT.md');
const out = path.join(root, 'netlify', 'edge-functions', '_lib', 'stick-prompt.ts');

const render = () =>
  '// AUTO-GENERATED from PROMPT.md - do not edit by hand.\n' +
  '// Regenerate after editing PROMPT.md: node scripts/gen-prompt.js\n\n' +
  'export const STICK_SYSTEM_PROMPT: string =\n  ' +
  JSON.stringify(fs.readFileSync(src, 'utf8')) + ';\n';

const inSync = () => fs.existsSync(out) && fs.readFileSync(out, 'utf8') === render();
module.exports = { inSync };

if (require.main === module) {
  if (process.argv.includes('--check')) {
    if (!inSync()) { console.error('stick-prompt.ts is out of date — run: node scripts/gen-prompt.js'); process.exit(1); }
    console.log('stick-prompt.ts is in sync with PROMPT.md');
  } else {
    fs.writeFileSync(out, render());
    console.log('wrote ' + path.relative(root, out));
  }
}

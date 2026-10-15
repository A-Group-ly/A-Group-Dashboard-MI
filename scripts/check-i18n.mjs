// Fails when a translation key used in the code is missing in English or Arabic.
//   node scripts/check-i18n.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { opsDict } from '../src/lib/opsDict.ts';

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?)$/.test(f)) files.push(p);
  }
})('src');

const used = new Map();
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/\bt\(\s*'([a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+)'\s*\)/g)) used.set(m[1], f);
}
const dynamicPrefixes = ['status.', 'type.', 'iv.', 'role.', 'pm.', 'alert.', 'act.', 'cz.', 'health.', 'set.refresh', 'mr.', 'fld.'];
const missing = [];
for (const [key, file] of used) {
  for (const lang of ['en', 'ar']) {
    if (!(key in opsDict[lang])) missing.push(`${lang}: ${key}  (${file})`);
  }
}
const onlyOne = Object.keys(opsDict.en).filter((k) => !(k in opsDict.ar)).concat(Object.keys(opsDict.ar).filter((k) => !(k in opsDict.en)));
console.log(`${used.size} literal keys checked, ${Object.keys(opsDict.en).length} English / ${Object.keys(opsDict.ar).length} Arabic entries`);
if (missing.length || onlyOne.length) {
  if (missing.length) console.log('MISSING:\n' + missing.join('\n'));
  if (onlyOne.length) console.log('IN ONE LANGUAGE ONLY:\n' + onlyOne.join('\n'));
  process.exit(1);
}
void dynamicPrefixes;
console.log('i18n OK');

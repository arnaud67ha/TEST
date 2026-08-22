import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('dist-artifact/index.html', 'utf8');
const scriptMatch = src.match(/<script[^>]*>[\s\S]*<\/script>/);
const styleMatch = src.match(/<style[^>]*>[\s\S]*<\/style>/);
if (!scriptMatch || !styleMatch) throw new Error('Could not find script/style block');

const out = `<title>Tower Keep — Aperçu</title>
${styleMatch[0]}
<div id="app"></div>
${scriptMatch[0]}
`;

writeFileSync(process.argv[2], out);
console.log('wrote', process.argv[2], out.length, 'bytes');

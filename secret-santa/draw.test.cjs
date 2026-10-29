// Run with: node secret-santa/draw.test.cjs
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// draw.js is a browser script; run it in a sandbox that stands in for window.
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'draw.js'), 'utf8'), sandbox);
const { drawSecretSanta } = sandbox.window;

const names = ['Alice', 'Bob', 'Chloé', 'David', 'Emma', 'Farid'];
const excl = [['Alice', 'Bob'], ['Bob', 'Alice'], ['Chloé', 'David'], ['David', 'Chloé']];
for (let run = 0; run < 2000; run++) {
  const r = drawSecretSanta(names, excl);
  assert(r, 'draw should succeed');
  assert.deepStrictEqual(Object.keys(r).sort(), [...names].sort());
  assert.deepStrictEqual(Object.values(r).sort(), [...names].sort());
  for (const g of names) {
    assert.notStrictEqual(r[g], g);
    assert(!excl.some(([a, b]) => a === g && b === r[g]));
  }
}
assert.strictEqual(drawSecretSanta(['A', 'B', 'C'], [['A', 'B'], ['A', 'C']]), null);
const twenty = Array.from({ length: 20 }, (_, i) => 'P' + i);
assert(drawSecretSanta(twenty, []));
console.log('OK');

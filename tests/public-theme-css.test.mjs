import test from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { publicThemeStyles } from '../scripts/postcss-public-theme.mjs';

const css = `html[data-theme="dark"] { color: white; }
html[data-theme='dark'] .card, .card:is(:hover, :focus) { border: 1px solid; }
@media (max-width: 800px) { html[data-theme=dark] .card { color: white; } .card { padding: 1rem; } }
html[data-theme="light"] .card { color: black; }
.preview :is(html[data-theme="dark"], .card) { display: block; }`;
test('production removes only explicit disabled dark selectors and retains functional/mixed/light selectors', async () => {
  const output = (await postcss([publicThemeStyles({ production: true })]).process(css, { from: undefined })).css;
  assert.doesNotMatch(output, /color: white/);
  assert.match(output, /\.card:is\(:hover, :focus\)/);
  assert.match(output, /padding: 1rem/);
  assert.match(output, /color: black/);
  assert.match(output, /\.preview :is\(html\[data-theme="dark"\], \.card\)/);
});
test('development keeps the entire dark preview stylesheet', async () => {
  assert.equal((await postcss([publicThemeStyles({ production: false })]).process(css, { from: undefined })).css, css);
});

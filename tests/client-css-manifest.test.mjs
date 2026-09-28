import test from 'node:test';
import assert from 'node:assert/strict';
import { attachBundledClientCss, clientCssManifest } from '../scripts/vite-client-css-manifest.mjs';

test('bundled client CSS reaches the RSC manifest before dependencies are collected', () => {
  const bundle = {
    sheet: { type: 'asset', names: ['style.css'], fileName: 'assets/style-hash.css' },
    page: { type: 'chunk', viteMetadata: { importedCss: new Set() } },
    lazyIntro: { type: 'chunk', viteMetadata: { importedCss: new Set() } },
  };
  let collected;
  const manifest = { name: 'rsc:virtual:vite-rsc/assets-manifest', generateBundle(_options, output) {
    collected = [output.page, output.lazyIntro].map(chunk => [...chunk.viteMetadata.importedCss]);
  } };
  clientCssManifest().configResolved({ plugins: [manifest] });
  assert.equal(manifest.generateBundle.order, 'post');
  manifest.generateBundle.handler.call({ environment: { name: 'client', config: { build: { cssCodeSplit: false } } } }, {}, bundle);
  assert.deepEqual(collected, [['assets/style-hash.css'], ['assets/style-hash.css']]);
});

test('missing bundled CSS fails the build instead of silently shipping unstyled pages', () => {
  assert.throws(() => attachBundledClientCss({}), /Expected one bundled client stylesheet/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { localMarkets } from '../features/trips/local-market.ts';
import { landingRegions } from '../features/landing/content.ts';

test('official market links are HTTPS and contain no affiliate or tracking query', () => {
  assert.ok(localMarkets.length > 0);
  for (const market of localMarkets) { const url = new URL(market.url); assert.equal(url.protocol, 'https:'); assert.equal(url.search, ''); assert.doesNotMatch(market.url, /affiliate|ref=|utm_|recommend|partner/i); }
});
test('market regions use only the canonical 18 Gyeongnam names', () => {
  const allowed = new Set(landingRegions.map(region => region.name));
  for (const market of localMarkets) for (const region of market.regions) assert.ok(allowed.has(region), region);
});
test('static records contain no product, price, donation, order, or personal fields', () => {
  assert.doesNotMatch(JSON.stringify(localMarkets), /price|stock|product|donat|payment|order|address|phone|card/i);
});
test('card explicitly returns null when the verified list is empty', () => {
  const source = readFileSync(new URL('../features/trips/components/LocalMarketCard.tsx', import.meta.url), 'utf8');
  assert.match(source, /if \(!markets\.length\) return null/);
  assert.doesNotMatch(source, /fetch\(|navigator\.geolocation|localStorage|analytics/);
});

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_PAGE = 'https://www.data.go.kr/data/15012892/standard.do';
const SOURCE_URL = 'https://file.localdata.go.kr/file/download/public_restroom_info/info?orgCode=6480000_ALL';
const OUTPUT = resolve('server/data/gyeongnam-restrooms.json');
const MANIFEST = resolve('server/data/gyeongnam-restrooms.manifest.json');
const CITY_BY_ORG = new Map([
  ['5670000', '창원시'], ['5310000', '진주시'], ['5330000', '통영시'], ['5340000', '사천시'],
  ['5350000', '김해시'], ['5360000', '밀양시'], ['5370000', '거제시'], ['5380000', '양산시'],
  ['5390000', '의령군'], ['5400000', '함안군'], ['5410000', '창녕군'], ['5420000', '고성군'],
  ['5430000', '남해군'], ['5440000', '하동군'], ['5450000', '산청군'], ['5460000', '함양군'],
  ['5470000', '거창군'], ['5480000', '합천군'],
]);
const text = (value, max = 200) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
const count = value => /^\d+$/.test(text(value)) ? Number(value) : 0;
const phone = value => /^[0-9+()\-\s]{7,30}$/.test(text(value, 30)) ? text(value, 30) : '';

export function parseCsv(source) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted && char === '"' && source[index + 1] === '"') { field += '"'; index++; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (!quoted && char === ',') { row.push(field); field = ''; continue; }
    if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && source[index + 1] === '\n') index++;
      row.push(field); field = ''; if (row.some(Boolean)) rows.push(row); row = []; continue;
    }
    field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [headers = [], ...values] = rows;
  return values.map(columns => Object.fromEntries(headers.map((header, index) => [header.replace(/^\uFEFF/, ''), columns[index] || ''])));
}

export function normalizeOfficialRestroom(row) {
  const city = CITY_BY_ORG.get(text(row['개방자치단체코드'], 20));
  const address = text(row['소재지도로명주소'] || row['소재지지번주소']);
  const referenceDate = text(row['데이터기준일자'], 10);
  const accessibleFixtures = count(row['남성용-장애인용대변기수']) + count(row['여성용-장애인용대변기수']);
  const openingHours = text(row['개방시간상세'] || row['개방시간'], 120);
  const phoneNumber = phone(row['전화번호']);
  if (!city || !text(row['관리번호'], 80) || !text(row['화장실명'], 120) || !address || !referenceDate || accessibleFixtures < 1 || (!openingHours && !phoneNumber)) return null;
  return {
    sourceId: text(row['관리번호'], 80), city, name: text(row['화장실명'], 120), address,
    ...(openingHours ? { openingHours } : {}), ...(phoneNumber ? { phoneNumber } : {}), referenceDate,
    accessibleFixtures,
  };
}

async function geocode(address, key) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/address.json');
  url.searchParams.set('query', address);
  const response = await fetch(url, { headers: { Authorization: `KakaoAK ${key}`, Accept: 'application/json' }, signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`Kakao address response ${response.status}`);
  const data = await response.json();
  const documents = Array.isArray(data.documents) ? data.documents.filter(item => {
    const resolved = text(item.road_address?.address_name || item.address?.address_name || item.address_name);
    return /^(경상남도|경남)\s/.test(resolved) && Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y));
  }) : [];
  if (documents.length !== 1) return null;
  return { latitude: Number(documents[0].y), longitude: Number(documents[0].x) };
}

function publicItem(row, destination) {
  const unknown = 'unknown';
  return {
    id: row.sourceId, name: row.name, address: row.address,
    ...(row.openingHours ? { openingHours: row.openingHours } : {}),
    ...(row.phoneNumber ? { phoneNumber: row.phoneNumber } : {}),
    evidence: { accessibleToilet: 'confirmed', entranceStep: unknown, entranceDoor: unknown, grabBars: unknown, turningSpace: unknown, sinkAccess: unknown, elevatorRequired: unknown, emergencyBell: unknown },
    sources: [{ type: 'official', provider: '행정안전부 전국공중화장실표준데이터', referenceDate: row.referenceDate }],
    destination,
  };
}

async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

async function main() {
  const inputAt = process.argv.indexOf('--input');
  const bytes = inputAt >= 0 ? await readFile(resolve(process.argv[inputAt + 1])) : Buffer.from(await (async () => {
    const response = await fetch(SOURCE_URL, { headers: { Accept: 'text/csv', Referer: SOURCE_PAGE, 'User-Agent': 'WAVE public-data updater' }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Official restroom download ${response.status}`);
    return response.arrayBuffer();
  })());
  const rows = parseCsv(new TextDecoder('euc-kr').decode(bytes));
  const normalized = rows.map(normalizeOfficialRestroom).filter(Boolean);
  const previous = await readFile(OUTPUT, 'utf8').then(JSON.parse).catch(() => []);
  const previousManifest = await readFile(MANIFEST, 'utf8').then(JSON.parse).catch(() => ({}));
  const previousByKey = new Map(previous.map(item => [`${item.id}\n${item.address}`, item.destination]));
  const key = text(process.env.KAKAO_REST_API_KEY, 200);
  const limit = Math.max(0, Math.min(500, Number(process.env.RESTROOM_GEOCODE_LIMIT || 60)));
  const selected = []; const perCity = new Map();
  for (const row of normalized) {
    if ((perCity.get(row.city) || 0) >= Math.ceil(limit / 5)) continue;
    perCity.set(row.city, (perCity.get(row.city) || 0) + 1); selected.push(row);
    if (selected.length >= limit) break;
  }
  const items = [];
  for (const row of normalized) {
    let destination = previousByKey.get(`${row.sourceId}\n${row.address}`) || null;
    if (!destination && key && selected.includes(row)) {
      try { destination = await geocode(row.address, key); } catch { destination = null; }
    }
    if (destination) items.push(publicItem(row, destination));
  }
  const cityCounts = Object.fromEntries([...CITY_BY_ORG.values()].map(city => [city, normalized.filter(row => row.city === city).length]));
  const geocodedCities = new Set(items.map(item => normalized.find(row => row.sourceId === item.id)?.city).filter(Boolean));
  const addressAndReference = rows.filter(row => text(row['소재지도로명주소'] || row['소재지지번주소']) && text(row['데이터기준일자'])).length;
  const gatePassed = normalized.length >= 30 && Object.values(cityCounts).filter(value => value > 0).length >= 5 && addressAndReference / Math.max(1, rows.length) >= 0.9 && items.length >= 30 && geocodedCities.size >= 5;
  const generatedAt = new Date().toISOString();
  await atomicJson(OUTPUT, gatePassed ? items : []);
  await atomicJson(MANIFEST, {
    schemaVersion: 1, enabled: gatePassed, generatedAt,
    source: { pageUrl: SOURCE_PAGE, downloadUrl: SOURCE_URL, portalModifiedAt: '2026-06-05', retrievedAt: generatedAt, rowCount: rows.length, sha256: createHash('sha256').update(bytes).digest('hex'), encoding: 'CP949', license: '이용허락범위 제한 없음', refresh: '매일 갱신·2일 전 기준 현행화', coordinates: '2025년 2월부터 원천 제공 중단' },
    audit: { eligibleBeforeGeocode: normalized.length, addressAndReferenceRate: addressAndReference / Math.max(1, rows.length), cityCounts, geocodedRows: items.length, geocodedCities: [...geocodedCities].sort(), requiredRows: 30, requiredCities: 5 },
    geocoding: key ? { method: 'Kakao Local address API', input: 'official public facility address only', matched: 'single Gyeongnam address', verifiedAt: generatedAt } : previousManifest.geocoding,
  });
  console.log(JSON.stringify({ enabled: gatePassed, rows: rows.length, eligible: normalized.length, geocoded: items.length, cities: geocodedCities.size }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });

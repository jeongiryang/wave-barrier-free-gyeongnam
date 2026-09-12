export const SESSION_PROFILES_KEY = 'wave-session-facilities-v1';
let memory = [];
const aliases = { wheel: 'wheel', wheelchair: 'wheel', '휠체어 편의시설': 'wheel', senior: 'senior', '접근로와 승강기': 'senior', baby: 'baby', '유아 편의시설': 'baby', pregnant: 'pregnant', '화장실과 실내 이동': 'pregnant', visual: 'visual', '시각 정보 지원': 'visual', hearing: 'hearing', '청각 정보 지원': 'hearing' };
export function currentProfileIds(value) { return Array.isArray(value) ? [...new Set(value.map(item => aliases[item]).filter(Boolean))] : []; }
export function readSessionProfiles(storage) { try { const raw = storage?.getItem(SESSION_PROFILES_KEY); return raw ? currentProfileIds(JSON.parse(raw)) : [...memory]; } catch { return [...memory]; } }
export function saveSessionProfiles(storage, selected) { memory = currentProfileIds(selected); try { storage.setItem(SESSION_PROFILES_KEY, JSON.stringify(memory)); return true; } catch { return false; } }

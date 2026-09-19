import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as experience from "../lib/experience.js";
import { groundAssistantProposal } from "../lib/assistant-grounding.js";
import { validateAssistantAction } from "../lib/assistant-actions.js";
import { shareSecretHash } from "../lib/trips/live-share.js";
import { newInviteToken } from "../lib/account-travel/model.js";
import { cacheControlHeader } from "../lib/http-cache.js";
import { verifySameOriginMutation } from "../lib/security/request-boundaries.js";
import { rateLimitResponse } from "../lib/rate-limit-response.js";
const now = Date.parse("2026-09-15T11:00:00Z");
const selections = () => ({
  region: "통영",
  theme: "nature",
  travelStart: "2026-09-15",
  travelEnd: "2026-09-16",
  selectedPlaceIds: ["1001", "1002", "1003"],
  scheduleAssignments: {
    1001: "2026-09-15",
    1002: "2026-09-15",
    1003: "2026-09-16",
  },
  fixedVisits: {},
  profiles: ["route"],
  note: "PRIVATE",
  origin: { lat: 35, lng: 128 },
});
test("observations reject stale/future/empty and remove arbitrary data", () => {
  for (const delta of [-experience.OBSERVATION_TTL - 1, 1])
    assert.throws(() =>
      experience.observationInput(
        {
          placeId: "1001",
          observedAt: now + delta,
          readings: { noise: "quiet" },
        },
        now,
      ),
    );
  assert.throws(() =>
    experience.observationInput(
      { placeId: "1001", observedAt: now, readings: { noise: "made-up" } },
      now,
    ),
  );
  assert.deepEqual(
    experience.observationInput(
      {
        placeId: "1001",
        observedAt: now,
        readings: { noise: "quiet", diagnosis: "PRIVATE" },
        gps: "PRIVATE",
      },
      now,
    ),
    { placeId: "1001", observedAt: now, readings: { noise: "quiet" } },
  );
});
test("absence, expired and conflicting field reports never become a safe/quiet score", () => {
  const r = (noise, age) => ({
    placeId: "1001",
    observedAt: now - age,
    readings: { noise },
  });
  const result = experience.sensorySummary(
    [r("quiet", experience.OBSERVATION_TTL), r("loud", 100), r("quiet", 50)],
    now,
  );
  assert.deepEqual(result.noise, {
    values: ["loud", "quiet"],
    count: 2,
    conflict: true,
  });
  assert.equal(result.mobility.count, 0);
});
test("companion changes retain private projection, dates and fixed positions", () => {
  const initial = experience.companionSnapshot(selections());
  assert.ok(!JSON.stringify(initial).includes("PRIVATE"));
  assert.deepEqual(initial.profiles, []);
  const moved = experience.editCompanionStop(initial, {
    id: "1002",
    direction: "up",
  });
  assert.deepEqual(moved.selectedPlaceIds, ["1002", "1001", "1003"]);
  assert.deepEqual(initial.selectedPlaceIds, ["1001", "1002", "1003"]);
  assert.throws(() =>
    experience.editCompanionStop(initial, { id: "1002", direction: "down" }),
  );
  initial.fixedVisits["1001"] = { kind: "event", time: "11:00", position: 0 };
  assert.throws(() =>
    experience.editCompanionStop(initial, { id: "1002", direction: "up" }),
  );
  assert.throws(() =>
    experience.editCompanionStop(initial, {
      id: "1001",
      minutes: 60,
      breakMinutes: 15,
    }),
  );
  assert.throws(() =>
    experience.editCompanionStop(initial, {
      id: "1002",
      minutes: 0,
      breakMinutes: 15,
    }),
  );
});
test("split costs conserve every won, exclude non-passengers and validate values", () => {
  const split = experience.splitExpense(10000, ["나", "동행1", "동행2"], "나");
  assert.deepEqual(
    split.map((s) => s.amount),
    [3334, 3333, 3333],
  );
  assert.equal(
    split.reduce((n, s) => n + s.amount, 0),
    10000,
  );
  for (const amount of [NaN, Infinity, -1, 1.5, 10000001])
    assert.throws(() => experience.splitExpense(amount, ["나"], "나"));
  assert.throws(() => experience.splitExpense(100, ["나", "나"], "나"));
  assert.throws(() => experience.splitExpense(100, ["나"], "미탑승자"));
});
test("participation records distinguish story and visit and reject future dates", () => {
  assert.equal(
    experience.passportEntry(
      { placeId: "1001", date: "2026-09-15", kind: "story" },
      now,
    ).kind,
    "story",
  );
  assert.throws(() =>
    experience.passportEntry(
      { placeId: "1001", date: "2026-09-16", kind: "visit" },
      now,
    ),
  );
  assert.throws(() =>
    experience.passportEntry(
      { placeId: "1001", date: "2026-02-30", kind: "visit" },
      now,
    ),
  );
});
test("explicit Tongyeong request repairs stale Changwon/Geoje model region and requested count", () => {
  for (const content of [
    "부모님과 통영 당일 여행을 준비해. 오래 걷지 않고 자주 쉴 수 있는 장소 3곳을 추천해줘.",
    "통영 여행지를 3곳만 추천해줘. 창원이나 거제는 제외해줘.",
  ]) {
    const grounded = groundAssistantProposal(
      { action: "search" },
      [{ role: "user", content }],
      { region: "창원", profiles: ["route"] },
    );
    assert.equal(grounded.region, "통영");
    assert.equal(grounded.count, 3);
    assert.equal(validateAssistantAction(grounded).count, 3);
  }
});
function compile(path, deps) {
  const exports = {};
  const source = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  new Function("exports", "require", source)(exports, (name) => {
    if (!(name in deps)) throw new Error(`Unexpected dependency ${name}`);
    return deps[name];
  });
  return exports;
}
const http = compile("../server/shared/http.ts", {
  "../../lib/http-cache.js": { cacheControlHeader },
  "../../lib/security/request-boundaries.js": { verifySameOriginMutation },
});
const id = "abcdef123456abcdef123456",
  secret = "a".repeat(64),
  origin = "https://wave.example";
const req = (body, token = "", method = "POST", from = origin) =>
  new Request(`${origin}/api/companions/${id}`, {
    method,
    headers: {
      origin: from,
      "content-type": "application/json",
      cookie: `wave-companion-${id}=${token}`,
    },
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
  });
async function handler({
  role = "editor",
  user = null,
  cas = true,
  rev = 1,
} = {}) {
  const calls = [],
    row = {
      id,
      owner_id: "owner",
      revision: rev,
      expires_at: Date.now() + 86400000,
      tokens: { [role]: await shareSecretHash(secret) },
      payload: {
        selections: experience.companionSnapshot(selections()),
        expenses: [],
        proposals: [],
        history: [],
      },
    };
  const sql = async (parts, ...values) => {
    const text = parts.join("?");
    calls.push({ text, values });
    if (text.startsWith("SELECT")) return [row];
    if (text.startsWith("UPDATE")) return cas ? [{ revision: rev + 1 }] : [];
    return [];
  };
  const loaded = compile("../server/trips/companions-handler.ts", {
    "../../features/community/server/session": {
      optionalCommunityUser: async () => user,
    },
    "../../lib/experience.js": experience,
    "../../lib/account-travel/model.js": { newInviteToken },
    "../../lib/trips/live-share.js": { shareSecretHash },
    "../../lib/rate-limit-response.js": { rateLimitResponse },
    "../shared/http": http,
    "./experience-database": { experienceDatabase: async () => sql },
  });
  return { run: loaded.handleCompanions, calls, row };
}
test("companion authorization rejects anonymous, viewer writes, proposer edits and cross origin", async () => {
  const edit = {
    operation: "edit",
    revision: 1,
    edit: { id: "1002", minutes: 60, breakMinutes: 15 },
  };
  const h = await handler();
  assert.equal((await h.run(req(edit))).status, 403);
  assert.equal(
    (await h.run(req(edit, secret, "POST", "https://evil.example"))).status,
    403,
  );
  for (const role of ["viewer", "proposer"]) {
    const h = await handler({ role });
    assert.equal((await h.run(req(edit, secret))).status, 403);
    assert.equal(h.calls.filter((c) => c.text.startsWith("UPDATE")).length, 0);
  }
});
test("stale revisions and atomic compare failures never overwrite the room", async () => {
  const h = await handler();
  assert.equal(
    (
      await h.run(
        req(
          {
            operation: "edit",
            revision: 0,
            edit: { id: "1002", minutes: 60, breakMinutes: 15 },
          },
          secret,
        ),
      )
    ).status,
    409,
  );
  assert.equal(h.calls.filter((c) => c.text.startsWith("UPDATE")).length, 0);
  const race = await handler({ cas: false });
  assert.equal(
    (
      await race.run(
        req(
          {
            operation: "edit",
            revision: 1,
            edit: { id: "1002", minutes: 60, breakMinutes: 15 },
          },
          secret,
        ),
      )
    ).status,
    409,
  );
});
test("join exchanges capability for scoped HttpOnly cookie and public response excludes secrets", async () => {
  const h = await handler();
  const response = await h.run(req({ operation: "join", token: secret }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
  assert.match(
    response.headers.get("set-cookie"),
    new RegExp(`Path=/api/companions/${id}`),
  );
  const body = await response.text();
  assert.ok(!body.includes(secret));
  assert.ok(!body.includes("owner_id"));
  assert.ok(!body.includes("tokens"));
});
test("proposal input cannot smuggle arbitrary private fields into stored room", async () => {
  const h = await handler({ role: "proposer" });
  const response = await h.run(
    req(
      {
        operation: "propose",
        revision: 1,
        edit: { id: "1002", minutes: 60, breakMinutes: 15, gps: "PRIVATE" },
      },
      secret,
    ),
  );
  assert.equal(response.status, 200);
  assert.ok(!JSON.stringify(h.calls).includes("PRIVATE"));
});
test("observation deletion needs only owner and place, never new readings", async () => {
  const calls = [];
  const sql = async (parts, ...values) => {
    calls.push({ text: parts.join("?"), values });
    return [];
  };
  const h = compile("../server/trips/observations-handler.ts", {
    "../../features/community/server/session": {
      optionalCommunityUser: async () => ({ id: "owner" }),
    },
    "../../lib/experience.js": experience,
    "../../lib/rate-limit-response.js": { rateLimitResponse },
    "../shared/http": http,
    "./experience-database": { experienceDatabase: async () => sql },
  });
  const response = await h.handleObservations(
    new Request(`${origin}/api/observations`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ operation: "remove", placeId: "1001" }),
    }),
  );
  assert.equal(response.status, 200);
  assert.match(calls[0].text, /author_id =/);
  assert.deepEqual(calls[0].values, ["owner", "1001"]);
});

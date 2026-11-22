// Reading the Gate project field into board.json (ORISO-Docs#211). The field is absent on the live board today.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBoard, driftCheck, fetchAll, liveOptions, validateBoard } from "../lib/board.mjs";
import { ITEMS_QUERY } from "../lib/queries.mjs";
import { GATE_NAMES } from "../lib/gate.mjs";
import { fixtureRunner } from "../export-board.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const FX = resolve(here, "../fixtures/project-export.json");
const NOW = "2026-10-22T12:00:00Z";

// Same recorded export, optionally with the Gate field and values added.
async function board({ withField = false, values = {} } = {}) {
  const fx = JSON.parse(readFileSync(FX, "utf8"));
  if (withField) fx.meta.data.organization.projectV2.fields.nodes.push({ __typename: "ProjectV2SingleSelectField", name: "Gate", options: GATE_NAMES.map((name) => ({ name })) });
  for (const page of fx.pages) for (const n of page.response.data.organization.projectV2.items.nodes) if (values[n.content?.number]) n.gate = { name: values[n.content.number] };
  const run = (q, v) => ("after" in v ? (v.after == null ? fx.pages[0] : fx.pages.find((p) => p.cursorBefore === v.after)).response : fx.meta);
  const data = await fetchAll(run, { owner: "o", number: 1 });
  return { data, board: buildBoard(data, { syncedAt: NOW }) };
}

test("the items query asks for the Gate project field by name", () => {
  assert.match(ITEMS_QUERY, /gate: fieldValueByName\(name: "Gate"\)/);
});

test("without the Gate field every item has gate null and the board still validates", async () => {
  const { board: b } = await board();
  assert.ok(b.items.length > 0);
  assert.ok(b.items.every((i) => i.gate === null));
  assert.deepEqual(b.fieldOptions.gate, []);
  assert.deepEqual(validateBoard(b), []);
});

test("with the Gate field the value lands on the item and the live options on fieldOptions", async () => {
  const { board: b } = await board({ withField: true, values: { 204: "R3 Human review" } });
  assert.equal(b.items.find((i) => i.number === 204).gate, "R3 Human review");
  assert.deepEqual(b.fieldOptions.gate, GATE_NAMES);
  assert.deepEqual(validateBoard(b), []);
});

test("the Gate/Status watcher runs on exported items: a gate that disagrees with the status is flagged", async () => {
  const { board: b } = await board({ withField: true, values: { 204: "R3 Human review" } }); // #204 is Ready on the recorded board
  const f = b.items.find((i) => i.number === 204).findings.find((x) => x.rule === "gate-status-mismatch");
  assert.deepEqual(f, { rule: "gate-status-mismatch", severity: "warn", detail: { gate: "R3 Human review", status: "Ready" } });
  assert.equal(b.findingCounts["gate-status-mismatch"], 1);
});

test("drift: a missing Gate field is fine (not created yet); a renamed option fails loudly", async () => {
  const absent = (await board()).data;
  assert.deepEqual(driftCheck(liveOptions(absent.meta)).problems, []);
  assert.equal(liveOptions(absent.meta).gate, null);
  const ok = (await board({ withField: true })).data;
  assert.deepEqual(driftCheck(liveOptions(ok.meta)).problems, []);
  const renamed = (await board({ withField: true })).data;
  renamed.meta.projectV2.fields.nodes.find((f) => f.name === "Gate").options[6].name = "R3 Review by human";
  const r = driftCheck(liveOptions(renamed.meta));
  assert.equal(r.ok, false);
  assert.match(r.problems.join("\n"), /Gate options drifted[\s\S]*"R3 Human review"[\s\S]*"R3 Review by human"/);
});

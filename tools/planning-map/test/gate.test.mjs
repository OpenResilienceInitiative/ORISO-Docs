// Gate field documentation (ORISO-Docs#211): the exact options and the admin command that creates the field.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gateOptions, GATE_NAMES, gateStep, createFieldCommands } from "../lib/gate.mjs";
import { PROJECT_ID } from "../lib/planning-api.mjs";
import { contract } from "../lib/board.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const file = JSON.parse(readFileSync(resolve(here, "../gate-options.json"), "utf8"));

test("the Gate options are exactly the eight agreed gates, in order", () => {
  assert.deepEqual(GATE_NAMES, ["P1 Framed", "P2 Specified", "P3 Sliced", "P4 Ready for agent", "R1 Checks green", "R2 AI review", "R3 Human review", "R4 Verified on Dev"]);
  assert.deepEqual(file.options.map((o) => o.name), GATE_NAMES);
});

test("each option has a phase, a step number, a valid GitHub colour, a short description and criteria in DE and EN", () => {
  const colours = ["GRAY", "BLUE", "GREEN", "YELLOW", "ORANGE", "RED", "PINK", "PURPLE"];
  file.options.forEach((o, i) => {
    assert.equal(o.phase, i < 4 ? "plan" : "review", o.name);
    assert.equal(o.step, i + 1, o.name);
    assert.ok(colours.includes(o.color), o.name);
    assert.ok(o.description.length > 0 && o.description.length <= 100, `${o.name}: GitHub allows 100 characters`);
    assert.ok(o.criteria.de.length > 10 && o.criteria.en.length > 10, o.name);
  });
});

test("the field is a single select named Gate on the ORISO Roadmap project", () => {
  assert.equal(file.field.name, "Gate");
  assert.equal(file.field.dataType, "SINGLE_SELECT");
  assert.equal(file.project.id, PROJECT_ID);
  assert.equal(file.project.owner, contract.project.owner);
  assert.equal(file.project.number, contract.project.number);
});

test("gateStep gives the 1-based position, 0 for none or unknown", () => {
  assert.deepEqual(["P1 Framed", "P4 Ready for agent", "R1 Checks green", "R4 Verified on Dev", null, "Nope"].map(gateStep), [1, 4, 5, 8, 0, 0]);
});

test("the documented commands are generated from the options, so they cannot drift", () => {
  const c = createFieldCommands(gateOptions);
  assert.deepEqual(file.createField, c);
  assert.equal(c.gh, `gh project field-create 1 --owner OpenResilienceInitiative --name Gate --data-type SINGLE_SELECT --single-select-options "${GATE_NAMES.join(",")}"`);
  for (const n of GATE_NAMES) assert.ok(c.graphql.includes(`name: "${n}"`), n);
  assert.ok(c.graphql.includes("createProjectV2Field") && c.graphql.includes("dataType: SINGLE_SELECT"));
  assert.ok(c.graphql.includes(PROJECT_ID));
});

test("the GraphQL command is safe to paste into a POSIX shell inside single quotes", () => {
  assert.ok(!file.createField.graphql.split("-f query='")[1].slice(0, -1).includes("'"));
});

test("the board contract pins the same options so the export can detect drift", () => {
  assert.deepEqual(contract.fields.gate.options, GATE_NAMES);
});

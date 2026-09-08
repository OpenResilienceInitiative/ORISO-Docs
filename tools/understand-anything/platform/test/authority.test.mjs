import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAuthority, authorityRelations } from "../lib/authority.mjs";
const repos = ["ORISO-Frontend", "ORISO-UserService"];
const accepted =
  "Status: Accepted\nScope: ORISO-UserService\nOwner: Backend lead\nSupersedes: none\nSuperseded-by: none";
function doc(text, id = "adr:a") {
  return { id, mentionedRepos: repos, authority: parseAuthority(text, repos) };
}
test("only accepted explicitly scoped and owned current decision governs", () => {
  const d = doc(accepted),
    edges = authorityRelations([d]);
  assert.equal(
    edges.find((e) => e.target === "service:ORISO-UserService").type,
    "governs",
  );
  assert.equal(
    edges.find((e) => e.target === "service:ORISO-Frontend").type,
    "mentions",
  );
  for (const status of ["Proposed", "Draft", "Rejected", "Superseded"]) {
    assert.ok(
      authorityRelations([doc(accepted.replace("Accepted", status))]).every(
        (e) => e.type !== "governs",
      ),
    );
  }
});
test("missing scope, owner or supersession declaration cannot govern", () => {
  for (const field of ["Scope", "Owner", "Supersedes", "Superseded-by"]) {
    const text = accepted
      .split("\n")
      .filter((l) => !l.startsWith(field + ":"))
      .join("\n");
    assert.ok(
      authorityRelations([doc(text)]).every((e) => e.type !== "governs"),
    );
  }
});
test("reverse supersession demotes prior accepted document; unresolved chain cannot authorize successor", () => {
  const a = doc(accepted),
    b = doc(accepted.replace("Supersedes: none", "Supersedes: adr:a"), "adr:b");
  const edges = authorityRelations([a, b]);
  assert.ok(
    edges
      .filter((e) => e.source === "adr:a")
      .every((e) => e.type !== "governs"),
  );
  assert.ok(edges.some((e) => e.source === "adr:b" && e.type === "governs"));
  assert.ok(
    authorityRelations([
      doc(accepted.replace("Supersedes: none", "Supersedes: missing")),
    ]).every((e) => e.type !== "governs"),
  );
});
test("a proposal to supersede does not revoke accepted authority", () => {
  const a = doc(accepted),
    b = doc(
      accepted
        .replace("Status: Accepted", "Status: Proposed")
        .replace("Supersedes: none", "Supersedes: adr:a"),
      "adr:b",
    );
  assert.ok(
    authorityRelations([a, b]).some(
      (e) => e.source === "adr:a" && e.type === "governs",
    ),
  );
});
test("contradictory lifecycle declarations never choose the convenient first value", () => {
  assert.ok(
    authorityRelations([doc(accepted + "\nStatus: Rejected")]).every(
      (e) => e.type !== "governs",
    ),
  );
});

test("fenced lifecycle examples and indented code cannot grant authority", () => {
  for (const text of [
    "```markdown\n" + accepted + "\n```",
    "~~~~ example\n" + accepted + "\n~~~~",
    "```\n" + accepted,
    accepted
      .split("\n")
      .map((l) => "    " + l)
      .join("\n"),
  ]) {
    assert.ok(
      authorityRelations([doc(text)]).every((e) => e.type !== "governs"),
    );
  }
  assert.ok(
    authorityRelations([doc(accepted + "\n```\nStatus: Rejected\n```")]).some(
      (e) => e.type === "governs",
    ),
  );
});
test("placeholder owners neither grant authority nor supersede existing authority", () => {
  for (const owner of [
    "TBD",
    "TODO",
    "unknown",
    "unassigned",
    "none",
    "n/a",
    "-",
    "<owner>",
    "[owner]",
    "TBD (Backend lead)",
  ]) {
    const b = doc(
      accepted
        .replace("Backend lead", owner)
        .replace("Supersedes: none", "Supersedes: adr:a"),
      "adr:b",
    );
    const edges = authorityRelations([doc(accepted), b]);
    assert.ok(
      edges
        .filter((e) => e.source === "adr:b")
        .every((e) => e.type !== "governs"),
    );
    assert.ok(edges.some((e) => e.source === "adr:a" && e.type === "governs"));
  }
});

test("hidden HTML comment examples cannot declare or contradict authority", () => {
  for (const suffix of ["\n-->", ""]) {
    assert.ok(
      authorityRelations([
        doc("<!-- Template example\n" + accepted + suffix),
      ]).every((e) => e.type !== "governs"),
    );
  }
  assert.ok(
    authorityRelations([doc(accepted + "\n<!-- Status: Rejected -->")]).some(
      (e) => e.type === "governs",
    ),
  );
});

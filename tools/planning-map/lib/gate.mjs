// Gate field definition (ORISO-Docs#211). gate-options.json is the reviewed list; this module reads it and
// derives the admin commands from it so the documented command cannot drift from the options.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const gateOptions = JSON.parse(readFileSync(resolve(here, "../gate-options.json"), "utf8"));
export const GATE_NAMES = gateOptions.options.map((o) => o.name);

// 1-based position along the eight gates; 0 for no or an unknown gate.
export const gateStep = (name) => GATE_NAMES.indexOf(name) + 1;

// The two ways a PROJECT ADMIN can create the field. Nothing in this repo runs them.
export function createFieldCommands(def) {
  const opts = def.options
    .map((o) => `{name: "${o.name}", color: ${o.color}, description: "${o.description}"}`)
    .join(", ");
  const query = `mutation($project: ID!) { createProjectV2Field(input: {projectId: $project, dataType: ${def.field.dataType}, name: "${def.field.name}", singleSelectOptions: [${opts}]}) { projectV2Field { ... on ProjectV2SingleSelectField { id name options { id name } } } } }`;
  return {
    gh: `gh project field-create ${def.project.number} --owner ${def.project.owner} --name ${def.field.name} --data-type ${def.field.dataType} --single-select-options "${def.options.map((o) => o.name).join(",")}"`,
    graphql: `gh api graphql -f project=${def.project.id} -f query='${query}'`,
  };
}

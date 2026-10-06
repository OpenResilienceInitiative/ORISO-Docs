// Same versioned supported-public policy used by the release input validator.
import { readFileSync } from "node:fs";
const policy = JSON.parse(
  readFileSync(new URL("../bundle/public-repositories.json", import.meta.url)),
);
if (
  policy.schemaVersion !== "oriso.ua.supported-public-repositories/v1" ||
  !Array.isArray(policy.repositories) ||
  new Set(policy.repositories).size !== policy.repositories.length ||
  policy.repositories.some(
    (name) => typeof name !== "string" || !/^ORISO-[A-Za-z0-9]+$/.test(name),
  )
)
  throw Error("Invalid supported-public repository policy");
const supportedPublic = new Set(policy.repositories);
export const isSupportedPublicRepository = (name) => supportedPublic.has(name);

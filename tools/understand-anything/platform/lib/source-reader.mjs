import { execFileSync } from "node:child_process";
import path from "node:path";
const refs = new Map();
export function bindSourceRevisions(sources) {
  refs.clear();
  for (const s of sources) {
    if (!/^[a-f0-9]{40}$/i.test(s.gitCommitHash ?? ""))
      throw new Error(`Unknown platform input revision: ${s.repo}`);
    refs.set(s.repo, s.gitCommitHash);
  }
}
export function readSource(repoDir, filePath) {
  const ref = refs.get(path.basename(repoDir));
  if (!ref) throw new Error(`Source not in platform provenance: ${repoDir}`);
  try {
    return execFileSync("git", ["-C", repoDir, "show", `${ref}:${filePath}`], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    // Prove absence in the bound tree instead of treating every Git failure as
    // optional discovery. Invalid repositories/revisions fail this command too.
    const entries = execFileSync(
      "git",
      ["-C", repoDir, "ls-tree", "-z", ref, "--", filePath],
      {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      },
    ).split("\0");
    const exists = entries.some(
      (entry) => entry.slice(entry.indexOf("\t") + 1) === filePath,
    );
    if (!exists) return null;
    // The tree names this path: unreadable/corrupt blobs and other read failures
    // must abort generation, never create an apparently complete partial graph.
    throw error;
  }
}
export function listSourceFiles(repoDir) {
  const ref = refs.get(path.basename(repoDir));
  if (!ref) throw new Error(`Source not in platform provenance: ${repoDir}`);
  return execFileSync(
    "git",
    ["-C", repoDir, "ls-tree", "-r", "--name-only", ref],
    {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    },
  )
    .split("\n")
    .filter(Boolean);
}

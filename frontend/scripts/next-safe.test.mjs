#!/usr/bin/env node
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = mkdtempSync(path.join(tmpdir(), "morfoschools-next-safe-"));
const tempFrontend = path.join(tempRoot, "frontend");

mkdirSync(path.join(tempFrontend, "scripts"), { recursive: true });
mkdirSync(path.join(tempFrontend, "src", "app"), { recursive: true });
mkdirSync(path.join(tempFrontend, ".next", "server", "chunks"), { recursive: true });
mkdirSync(path.join(tempFrontend, ".next-alt", "server", "chunks"), { recursive: true });
writeFileSync(path.join(tempFrontend, "postcss.config.mjs"), 'export default { plugins: { "@tailwindcss/postcss": {} } };\n');
writeFileSync(path.join(tempFrontend, "src", "app", "globals.css"), '@import "tailwindcss";\n');
writeFileSync(path.join(tempFrontend, "scripts", "next-safe.mjs"), readFileSync(path.join(repoRoot, "scripts", "next-safe.mjs"), "utf8"));

const result = spawnSync(process.execPath, ["scripts/next-safe.mjs", "dev", "--help"], {
  cwd: tempFrontend,
  env: { ...process.env, PATH: `${path.join(repoRoot, "node_modules", ".bin")}:${process.env.PATH}` },
  encoding: "utf8",
});

if (existsSync(path.join(tempFrontend, ".next"))) {
  console.error("next-safe dev should remove stale .next before starting Next.js");
  console.error(result.stdout);
  console.error(result.stderr);
  rmSync(tempRoot, { recursive: true, force: true });
  process.exit(1);
}

const altResult = spawnSync(process.execPath, ["scripts/next-safe.mjs", "build", "--help"], {
  cwd: tempFrontend,
  env: { ...process.env, NEXT_DIST_DIR: ".next-alt", PATH: `${path.join(repoRoot, "node_modules", ".bin")}:${process.env.PATH}` },
  encoding: "utf8",
});

if (existsSync(path.join(tempFrontend, ".next-alt"))) {
  console.error("next-safe build should remove stale NEXT_DIST_DIR when configured");
  console.error(altResult.stdout);
  console.error(altResult.stderr);
  rmSync(tempRoot, { recursive: true, force: true });
  process.exit(1);
}

const dockerignore = readFileSync(path.join(repoRoot, ".dockerignore"), "utf8");
for (const required of [".next", ".next-*", ".next-hermes-build"]) {
  if (!dockerignore.split(/\r?\n/).includes(required)) {
    console.error(`.dockerignore must exclude ${required} so stale Next/Tailwind build artifacts cannot enter Docker build context`);
    rmSync(tempRoot, { recursive: true, force: true });
    process.exit(1);
  }
}

rmSync(tempRoot, { recursive: true, force: true });
console.log("[next-safe.test] dev/build commands remove stale configured Next dist dirs and Docker excludes stale Next caches.");

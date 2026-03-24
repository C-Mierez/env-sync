#!/usr/bin/env node
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const distCliPath = resolve(here, "../dist/cli.js");
const srcCliPath = resolve(here, "../src/cli.ts");

let entryFile = distCliPath;

if (!existsSync(distCliPath)) {
  if (process.versions?.bun && existsSync(srcCliPath)) {
    // Bun can execute TypeScript directly, so git installs still work when prepare is blocked.
    entryFile = srcCliPath;
  } else {
    console.error("[env-sync] Failed to start CLI.");
    console.error("Missing dist/cli.js. If installed with Bun from GitHub, run `bun pm untrusted` and reinstall to allow prepare scripts, or use Bun runtime.");
    process.exitCode = 1;
  }
}

if (process.exitCode !== 1) {
  const entryUrl = pathToFileURL(entryFile).href;
  import(entryUrl).catch((error) => {
    console.error("[env-sync] Failed to start CLI.");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

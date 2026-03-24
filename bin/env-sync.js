#!/usr/bin/env node
import("../dist/cli.js").catch((error) => {
  console.error("[env-sync] Failed to start CLI.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

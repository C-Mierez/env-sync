#!/usr/bin/env node
import { cwd } from "node:process";
import { runSync } from "./core/sync.js";
import { runCheck } from "./core/check.js";
import { createGithubWorkflow } from "./core/github-workflow.js";

const command = process.argv[2] ?? "--help";

try {
  switch (command) {
    case "sync": {
      const result = runSync(cwd());
      if (result.envExampleChanged) {
        console.log("Updated env.example from src/env.ts.");
      } else {
        console.log("env.example already up to date.");
      }

      if (result.dotEnvChanged) {
        console.log("Updated .env with safe autofixes.");
      } else {
        console.log(".env already normalized.");
      }

      for (const warning of result.warnings) {
        console.warn(`[warn] ${warning}`);
      }

      if (result.errors.length > 0) {
        for (const error of result.errors) {
          console.error(`[error] ${error}`);
        }
        process.exitCode = 1;
      }

      break;
    }
    case "check": {
      const result = runCheck(cwd());

      for (const warning of result.warnings) {
        console.warn(`[warn] ${warning}`);
      }

      if (result.errors.length > 0) {
        for (const error of result.errors) {
          console.error(`[error] ${error}`);
        }
        process.exitCode = 1;
      } else {
        console.log("env.example and .env are valid and in sync.");
      }

      break;
    }
    case "init-workflow": {
      const result = createGithubWorkflow(cwd());
      if (result.created) {
        console.log("Created GitHub Actions workflow for env sync checks.");
        console.log(result.workflowPath);
      } else {
        console.log("GitHub Actions workflow already exists.");
        console.log(result.workflowPath);
      }
      break;
    }
    case "--help":
    case "-h":
    default:
      printHelp();
      process.exitCode = command === "--help" || command === "-h" ? 0 : 1;
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[env-sync] ${message}`);
  process.exitCode = 1;
}

function printHelp(): void {
  console.log(`env-sync\n\nUsage:\n  env-sync sync\n  env-sync check\n  env-sync init-workflow\n\nCommands:\n  sync           Regenerate env.example and autofix .env where safe\n  check          Validate env.example/.env against src/env.ts\n  init-workflow  Create .github/workflows/env-sync-check.yml\n`);
}

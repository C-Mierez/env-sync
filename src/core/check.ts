import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildEnvExample } from "./sync.js";
import { extractEnvKeys } from "./extract-env-schema.js";
import { syncDotenvContent } from "./dotenv.js";

export interface CheckResult {
  errors: string[];
  warnings: string[];
}

export function runCheck(cwd: string): CheckResult {
  const keys = extractEnvKeys(cwd);
  const errors: string[] = [];
  const warnings: string[] = [];

  const envExamplePath = resolve(cwd, "env.example");
  const dotEnvPath = resolve(cwd, ".env");

  const expected = buildEnvExample(keys);
  const current = existsSync(envExamplePath) ? normalize(readFileSync(envExamplePath, "utf8")) : "";
  if (current !== expected) {
    errors.push("env.example is out of sync with src/env.ts. Run: env-sync sync");
  }

  const dotEnv = existsSync(dotEnvPath) ? readFileSync(dotEnvPath, "utf8") : "";
  const dotEnvResult = syncDotenvContent(dotEnv, keys);

  for (const warning of dotEnvResult.warnings) {
    warnings.push(warning);
  }

  for (const error of dotEnvResult.unresolvedErrors) {
    errors.push(error);
  }

  if (dotEnvResult.hasChanges) {
    errors.push(".env needs regeneration/normalization. Run: env-sync sync");
  }

  return { errors, warnings };
}

function normalize(text: string): string {
  let value = text.replace(/\r\n/g, "\n");
  if (!value.endsWith("\n")) {
    value += "\n";
  }
  return value;
}

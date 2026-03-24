import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const WORKFLOW_RELATIVE_PATH = ".github/workflows/env-sync-check.yml";

const WORKFLOW_CONTENT = `name: Env Sync Check

on:
  pull_request:
  push:

jobs:
  env-sync-check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Validate env sync
        run: bunx --bun env-sync check --ci
`;

export interface GithubWorkflowResult {
  created: boolean;
  workflowPath: string;
}

export function createGithubWorkflow(cwd: string): GithubWorkflowResult {
  const workflowPath = resolve(cwd, WORKFLOW_RELATIVE_PATH);
  const workflowDir = resolve(cwd, ".github/workflows");

  if (existsSync(workflowPath)) {
    return { created: false, workflowPath };
  }

  mkdirSync(workflowDir, { recursive: true });
  writeFileSync(workflowPath, WORKFLOW_CONTENT, "utf8");

  return { created: true, workflowPath };
}

import { afterEach, describe, expect, it } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCheck } from "../src/core/check.js";
import { runSync } from "../src/core/sync.js";

const fixtureRoot = resolve("tests/fixtures/next-app-unsynced");
const tmpDirs: string[] = [];

function prepareFixtureCopy(): string {
  const tempDir = mkdtempSync(join(tmpdir(), "env-sync-test-"));
  tmpDirs.push(tempDir);

  const target = join(tempDir, "app");
  cpSync(fixtureRoot, target, { recursive: true });
  return target;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("env-sync fixture behavior", () => {
  it("check fails on an unsynced fixture", () => {
    const cwd = prepareFixtureCopy();
    const result = runCheck(cwd);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.join("\n")).toContain("env.example is out of sync");
    expect(result.errors.join("\n")).toContain(".env needs regeneration/normalization");
  });

  it("sync regenerates env.example and normalizes .env", () => {
    const cwd = prepareFixtureCopy();
    const result = runSync(cwd);

    expect(result.envExampleChanged).toBeTrue();
    expect(result.dotEnvChanged).toBeTrue();
    expect(result.errors).toEqual([]);

    const envExample = readFileSync(join(cwd, "env.example"), "utf8");
    const dotEnv = readFileSync(join(cwd, ".env"), "utf8");

    expect(envExample).toContain("# Server");
    expect(envExample).toContain("AUTH_SECRET=");
    expect(envExample).toContain("DATABASE_URL=");
    expect(envExample).toContain("OPTIONAL_TIMEOUT=");
    expect(envExample).toContain("# Client");
    expect(envExample).toContain("NEXT_PUBLIC_APP_URL=");

    expect(dotEnv).toContain("DATABASE_URL=https://db.example.com");
    expect(dotEnv).toContain("AUTH_SECRET=supersecret");
    expect(dotEnv).toContain("NEXT_PUBLIC_APP_URL=https://app.example.com");
    expect(dotEnv).toContain("OPTIONAL_TIMEOUT=");
    expect(dotEnv).toContain("EXTRA_KEEP=1");

    const duplicateOccurrences = (dotEnv.match(/AUTH_SECRET=/g) ?? []).length;
    expect(duplicateOccurrences).toBe(1);
  });

  it("check passes after sync", () => {
    const cwd = prepareFixtureCopy();

    runSync(cwd);
    const result = runCheck(cwd);

    expect(result.errors).toEqual([]);
  });
});

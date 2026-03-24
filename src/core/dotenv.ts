import type { DotenvValidationResult, EnvKey, ParsedDotenv } from "../types.js";

const KEY_PATTERN = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;

export function parseDotenv(content: string): ParsedDotenv {
  const lines = content.split(/\r?\n/);
  const values = new Map<string, string>();
  const duplicateKeys = new Set<string>();
  const invalidLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = KEY_PATTERN.exec(lines[i]);
    if (!match) {
      invalidLines.push(i + 1);
      continue;
    }

    const [, key, value] = match;
    if (values.has(key)) {
      duplicateKeys.add(key);
    }

    values.set(key, value);
  }

  return { values, duplicateKeys, invalidLines };
}

export function syncDotenvContent(existingContent: string, keys: EnvKey[]): DotenvValidationResult {
  const lines = existingContent.split(/\r?\n/);
  const known = new Set(keys.map((item) => item.key));
  const seen = new Set<string>();
  const warnings: string[] = [];
  const unresolvedErrors: string[] = [];

  const rebuilt: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const original = lines[i];
    const trimmed = original.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      rebuilt.push(original);
      continue;
    }

    const match = KEY_PATTERN.exec(original);
    if (!match) {
      rebuilt.push(original);
      unresolvedErrors.push(`Invalid dotenv syntax at line ${i + 1}.`);
      continue;
    }

    const [, key, value] = match;

    if (seen.has(key)) {
      warnings.push(`Removed duplicate key ${key} from .env.`);
      continue;
    }

    seen.add(key);

    if (!known.has(key)) {
      rebuilt.push(original);
      continue;
    }

    rebuilt.push(`${key}=${value}`);
  }

  const existingKnownValues = new Map<string, string>();
  for (const line of rebuilt) {
    const match = KEY_PATTERN.exec(line);
    if (!match) {
      continue;
    }
    existingKnownValues.set(match[1], match[2]);
  }

  const missing: string[] = [];
  for (const key of keys) {
    if (!existingKnownValues.has(key.key)) {
      rebuilt.push(`${key.key}=`);
      existingKnownValues.set(key.key, "");
      missing.push(key.key);
    }
  }

  if (missing.length > 0) {
    warnings.push(`Added missing keys to .env: ${missing.join(", ")}.`);
  }

  for (const key of keys) {
    if (!key.required) {
      continue;
    }

    const value = existingKnownValues.get(key.key);
    if (value === undefined || value.trim() === "") {
      unresolvedErrors.push(`Required key ${key.key} is empty in .env.`);
    }
  }

  let nextContent = rebuilt.join("\n");
  if (!nextContent.endsWith("\n")) {
    nextContent += "\n";
  }

  const normalizedExisting = normalizeNewline(existingContent);

  return {
    hasChanges: nextContent !== normalizedExisting,
    nextContent,
    unresolvedErrors,
    warnings,
  };
}

function normalizeNewline(text: string): string {
  let normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.endsWith("\n")) {
    normalized += "\n";
  }
  return normalized;
}

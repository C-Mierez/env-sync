import ts from "typescript";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EnvKey, EnvScope } from "../types.js";

const SOURCE_FILE = "src/env.ts";

export function getEnvSourcePath(cwd: string): string {
  return resolve(cwd, SOURCE_FILE);
}

export function extractEnvKeys(cwd: string): EnvKey[] {
  const sourcePath = getEnvSourcePath(cwd);
  const sourceText = readFileSync(sourcePath, "utf8");
  const sourceFile = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  const createEnvObject = findCreateEnvObject(sourceFile);
  if (!createEnvObject) {
    throw new Error("Could not find a createEnv({ ... }) call in src/env.ts.");
  }

  const keys: EnvKey[] = [];
  readScopeKeys(createEnvObject, "server", keys);
  readScopeKeys(createEnvObject, "client", keys);

  const seen = new Set<string>();
  const deduped: EnvKey[] = [];
  for (const key of keys) {
    if (seen.has(key.key)) {
      continue;
    }
    seen.add(key.key);
    deduped.push(key);
  }

  return deduped.sort((a, b) => {
    if (a.scope === b.scope) {
      return a.key.localeCompare(b.key);
    }
    return a.scope === "server" ? -1 : 1;
  });
}

function findCreateEnvObject(sourceFile: ts.SourceFile): ts.ObjectLiteralExpression | null {
  let found: ts.ObjectLiteralExpression | null = null;

  function visit(node: ts.Node): void {
    if (found) {
      return;
    }

    if (ts.isCallExpression(node)) {
      const expression = node.expression.getText(sourceFile);
      if (expression.endsWith("createEnv") && node.arguments.length > 0) {
        const firstArg = node.arguments[0];
        if (ts.isObjectLiteralExpression(firstArg)) {
          found = firstArg;
          return;
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}

function readScopeKeys(root: ts.ObjectLiteralExpression, scope: EnvScope, keys: EnvKey[]): void {
  const scopeNode = root.properties.find((property) => {
    if (!ts.isPropertyAssignment(property)) {
      return false;
    }
    return getPropertyName(property.name) === scope;
  });

  if (!scopeNode || !ts.isPropertyAssignment(scopeNode) || !ts.isObjectLiteralExpression(scopeNode.initializer)) {
    return;
  }

  for (const prop of scopeNode.initializer.properties) {
    if (!ts.isPropertyAssignment(prop)) {
      continue;
    }

    const key = getPropertyName(prop.name);
    if (!key) {
      continue;
    }

    const initializerText = prop.initializer.getText(root.getSourceFile());
    keys.push({
      key,
      scope,
      required: !isOptionalSchema(initializerText),
    });
  }
}

function getPropertyName(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) {
    return name.text;
  }
  return null;
}

function isOptionalSchema(schemaText: string): boolean {
  return (
    schemaText.includes(".optional(") ||
    schemaText.includes(".optional()") ||
    schemaText.includes(".default(") ||
    schemaText.includes(".catch(") ||
    schemaText.includes(".nullish(")
  );
}

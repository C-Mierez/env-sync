export type EnvScope = "server" | "client";

export interface EnvKey {
  key: string;
  scope: EnvScope;
  required: boolean;
}

export interface ParsedDotenv {
  values: Map<string, string>;
  duplicateKeys: Set<string>;
  invalidLines: number[];
}

export interface DotenvValidationResult {
  hasChanges: boolean;
  nextContent: string;
  unresolvedErrors: string[];
  warnings: string[];
}

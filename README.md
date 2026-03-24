# @c-mierez/env-sync

Sync and validate `env.example` and `.env` against schema keys defined in `src/env.ts` using `@t3-oss/env-nextjs` and `zod`.

`src/env.ts` is the source of truth.

## What it does

- Reads `src/env.ts` and extracts `server` and `client` schema keys from `createEnv({...})`.
- Regenerates `env.example` deterministically.
- Auto-fixes safe `.env` issues (missing keys, duplicate keys, formatting normalization).
- Fails when unresolved `.env` issues remain (for example required keys are still empty).

## Install

```bash
bun add -d github:C-Mierez/env-sync#main
```

## Commands

```bash
# Regenerate env.example and autofix .env
bunx env-sync sync

# Validate that both files are in sync and valid
bunx env-sync check
```

## Suggested package scripts in your Next.js app

```json
{
    "scripts": {
        "env:sync": "bunx --bun env-sync sync",
        "env:check": "bunx --bun env-sync check"
    }
}
```

## Lefthook pre-commit integration

Install lefthook in your app:

```bash
bun add -d lefthook
bunx lefthook install
```

Create `.lefthook.yml` in your app:

```yml
pre-commit:
    parallel: false
    commands:
        env-sync-fix:
            run: bunx --bun env-sync sync
        env-sync-check:
            run: bunx --bun env-sync check
```

This gives you a pre-commit flow that:

1. Re-generates `env.example`.
2. Applies safe `.env` autofixes.
3. Blocks the commit if unresolved validation errors remain.

## Expected env.ts shape

This package expects `src/env.ts` to contain a `createEnv({...})` call with `server` and/or `client` objects, such as:

```ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
    server: {
        DATABASE_URL: z.string().url(),
    },
    client: {
        NEXT_PUBLIC_APP_URL: z.string().url(),
    },
    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    },
});
```

## Notes

- v1 scope is strict: `src/env.ts`, `env.example`, and `.env` at project root.
- Bun is the primary workflow (`bunx`/`bun run`), but runtime is Node-compatible.

## Development

Run fixture tests:

```bash
bun test
```

# Regressions — Named Failure Rules

> Loaded at the start of every session. Each line prevents a past mistake from recurring.
> Format: [DATE] [RULE NAME] — short description

[2026-03-01] CLIENT_IMPORT_BOUNDARY — Client components ("use client") must NEVER import from `@comtammatu/database/src/supabase` barrel. Use `@comtammatu/database/src/supabase/client` directly.
[2026-03-01] REGEN_TYPES_AFTER_MIGRATION — After any SQL migration that adds/modifies functions, ALWAYS regenerate `database.types.ts` before referencing via `supabase.rpc()`.
[2026-03-01] NOUNCHECKED_INDEX — With `noUncheckedIndexedAccess: true`, array index access like `errors[0].message` must use optional chaining: `errors[0]?.message ?? fallback`.
[2026-03-05] UNIQUE_PER_TENANT — UNIQUE constraints on tenant-scoped tables must be composite (e.g., `UNIQUE(field, tenant_id)`), never global. A global UNIQUE prevents the same entity from existing across tenants.
[2026-03-05] RLS_COVERS_ALL_ACTORS — When a Server Action performs writes on behalf of non-admin roles (e.g., staff re-registering rejected device), verify RLS policies allow that role to perform the operation. Supabase silently returns `{ data: null, error: null }` when RLS blocks.
[2026-03-13] EXPORTS_BACKWARD_COMPAT — When adding `exports` field to package.json, include BOTH new clean paths AND existing `/src/` prefixed paths. Node.js `exports` is strict — unlisted paths are unresolvable.
[2026-03-13] PG_FUNC_DEFAULTS_LAST — In PostgreSQL CREATE FUNCTION, all parameters with DEFAULT values must come after all required parameters. Otherwise: `input parameters after one with a default value must also have defaults`.
[2026-03-13] CLIENT_EXPORT_NAME — `@comtammatu/database/src/supabase/client` exports `createClient`, not `createBrowserClient`. The internal `@supabase/ssr` function is wrapped and renamed.
[2026-03-13] CSP_UNSAFE_EVAL_DEV_ONLY — `unsafe-eval` in CSP must only be enabled in development (needed for HMR/React DevTools). Production CSP must NOT include `unsafe-eval`. Check `next.config.ts` `buildCsp()`.
[2026-03-13] RATE_LIMIT_BEFORE_AUTH — Rate limiting and account lockout checks must run BEFORE calling `supabase.auth.signInWithPassword()` to prevent wasting auth API calls on locked accounts.

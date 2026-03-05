# Regressions — Named Failure Rules

> Loaded at the start of every session. Each line prevents a past mistake from recurring.
> Format: [DATE] [RULE NAME] — short description

[2026-03-01] CLIENT_IMPORT_BOUNDARY — Client components ("use client") must NEVER import from `@comtammatu/database/src/supabase` barrel. Use `@comtammatu/database/src/supabase/client` directly.
[2026-03-01] REGEN_TYPES_AFTER_MIGRATION — After any SQL migration that adds/modifies functions, ALWAYS regenerate `database.types.ts` before referencing via `supabase.rpc()`.
[2026-03-01] NOUNCHECKED_INDEX — With `noUncheckedIndexedAccess: true`, array index access like `errors[0].message` must use optional chaining: `errors[0]?.message ?? fallback`.
[2026-03-05] UNIQUE_PER_TENANT — UNIQUE constraints on tenant-scoped tables must be composite (e.g., `UNIQUE(field, tenant_id)`), never global. A global UNIQUE prevents the same entity from existing across tenants.
[2026-03-05] RLS_COVERS_ALL_ACTORS — When a Server Action performs writes on behalf of non-admin roles (e.g., staff re-registering rejected device), verify RLS policies allow that role to perform the operation. Supabase silently returns `{ data: null, error: null }` when RLS blocks.

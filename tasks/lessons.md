# Lessons Learned

> Updated after every correction from user.
> Format: Pattern -> Rule -> Prevention

## 2026-02-28: @supabase/ssr version must match @supabase/supabase-js
**Pattern:** Supabase typed operations (.insert/.update/.eq) resolve to `never`
**Rule:** `@supabase/ssr@0.6.1` passes 3 type params to `SupabaseClient`, but `@supabase/supabase-js@2.98.0` expects 5 (added `SchemaNameOrClientOptions` + `ClientOptions`). This causes Schema (object) to land in SchemaName (string) position → everything becomes `never`.
**Prevention:** Always update `@supabase/ssr` when bumping `@supabase/supabase-js`. Use `@supabase/ssr@0.8.0+` with `@supabase/supabase-js@2.98.0`.

## 2026-02-28: Separate Prisma from Supabase exports for Edge Runtime
**Pattern:** Middleware importing from `@comtammatu/database` barrel export pulls in Prisma (Node.js modules) which breaks Edge Runtime.
**Rule:** Create a `@comtammatu/database/src/supabase` subpath export that only includes Supabase utilities. Middleware and auth callback routes import from this subpath instead.
**Prevention:** Never import Prisma in Edge-compatible routes. Use `@comtammatu/database/src/supabase` for middleware and API routes that run on Edge.

## 2026-02-28: Prisma 7 breaking changes
**Pattern:** Prisma 7 removed `url`/`directUrl` from `schema.prisma`, changed generator provider from `prisma-client-js` to `prisma-client`, requires explicit output directory.
**Rule:** Use `prisma.config.ts` for datasource URL config. Use `@prisma/adapter-pg` driver adapter pattern. Generated client is at `../generated/prisma/client` (not `@prisma/client`).
**Prevention:** Always check Prisma version migration guides when upgrading major versions.

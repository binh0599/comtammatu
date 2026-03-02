/**
 * Server-side bootstrap — configures shared utilities with app-specific dependencies.
 * Import this file once in a server layout or at the top of each action file.
 *
 * This bridges the `@comtammatu/shared` package (which has no dependency on `@comtammatu/database`)
 * with the actual Supabase server client factory from the database package.
 */
import { createSupabaseServer } from "@comtammatu/database";
import { configureActionContext } from "@comtammatu/shared";

configureActionContext(createSupabaseServer);

// Supabase-only exports (safe for Edge Runtime / Middleware)
export { createClient as createSupabaseServer } from "./server";
export { createClient as createSupabaseBrowser } from "./client";
export { updateSession } from "./middleware";
export type { Database } from "../types/database.types";

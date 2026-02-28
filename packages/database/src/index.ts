// Prisma (type-safe data queries via PgBouncer)
export { prisma } from "./prisma";
export type { PrismaClient } from "../generated/prisma/client";

// Supabase (Auth, Realtime, Storage only)
export { createClient as createSupabaseServer } from "./supabase/server";
export { createClient as createSupabaseBrowser } from "./supabase/client";
export { updateSession } from "./supabase/middleware";
export type { Database } from "./types/database.types";

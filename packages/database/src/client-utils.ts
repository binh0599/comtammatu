import { createClient } from "./supabase/server";

/**
 * Batch-fetch related data to avoid N+1 queries
 * @param supabase - Supabase server client
 * @param table - Database table name
 * @param ids - Array of identifiers to fetch
 * @param selectColumns - Columns to select (default: "*")
 * @param primaryKey - The primary key column to match (default: "id")
 * @returns Map of id → data for fast lookup
 */
export async function batchFetch<T extends Record<string, any>>(
    supabase: Awaited<ReturnType<typeof createClient>>,
    table: string,
    ids: (string | number)[],
    selectColumns: string = "*",
    primaryKey: string = "id"
): Promise<Map<string | number, T>> {
    if (!ids || ids.length === 0) return new Map();

    // Deduplicate IDs safely
    const uniqueIds = Array.from(new Set(ids)).filter(
        (id) => id !== null && id !== undefined
    );

    if (uniqueIds.length === 0) return new Map();

    const { data, error } = await supabase
        .from(table as any)
        .select(selectColumns)
        .in(primaryKey, uniqueIds);

    if (error) {
        console.error(`Error batch fetching from ${table}:`, error.message);
        throw new Error(`Error fetching from ${table}: ${error.message}`);
    }

    const map = new Map<string | number, T>();
    if (data) {
        for (const row of data) {
            map.set((row as any)[primaryKey], row as unknown as T);
        }
    }
    return map;
}

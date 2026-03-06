"use client";

import { useEffect } from "react";
import {
  cacheMenuData,
  cacheTableData,
  getCachedMenuData,
  getCachedTableData,
} from "@/app/(pos)/pos/lib/offline-db";

/**
 * Caches menu items and categories to IndexedDB whenever they change.
 * Call this from any POS client component that receives menu data as props.
 * Data is written in the background — does not block rendering.
 */
export function useMenuCache(
  menuItems: unknown[],
  categories: unknown[],
) {
  useEffect(() => {
    if (menuItems.length > 0) {
      cacheMenuData("menuItems", menuItems).catch(() => {});
    }
    if (categories.length > 0) {
      cacheMenuData("categories", categories).catch(() => {});
    }
  }, [menuItems, categories]);
}

/**
 * Caches table data to IndexedDB whenever it changes.
 * Call this from the table map component.
 */
export function useTableCache(tables: unknown[]) {
  useEffect(() => {
    if (tables.length > 0) {
      cacheTableData("tables", tables).catch(() => {});
    }
  }, [tables]);
}

/**
 * Load cached menu data from IndexedDB.
 * Returns null if no cache exists.
 */
export async function loadCachedMenu(): Promise<{
  menuItems: unknown[];
  categories: unknown[];
} | null> {
  try {
    const [itemsEntry, categoriesEntry] = await Promise.all([
      getCachedMenuData("menuItems"),
      getCachedMenuData("categories"),
    ]);

    if (!itemsEntry || !categoriesEntry) return null;

    return {
      menuItems: itemsEntry.data as unknown[],
      categories: categoriesEntry.data as unknown[],
    };
  } catch {
    return null;
  }
}

/**
 * Load cached table data from IndexedDB.
 * Returns null if no cache exists.
 */
export async function loadCachedTables(): Promise<unknown[] | null> {
  try {
    const entry = await getCachedTableData("tables");
    return entry ? (entry.data as unknown[]) : null;
  } catch {
    return null;
  }
}

import type { Metadata } from "next";
import { createSupabaseServer } from "@comtammatu/database";
import { getPublicMenu } from "../actions";
import { MenuBrowser } from "./menu-browser";
import { MenuPageClient } from "./menu-page-client";

export const metadata: Metadata = {
  title: "Thực đơn - Cơm tấm Má Tư",
};

// Revalidate menu data every 5 minutes (menu doesn't change frequently)
export const revalidate = 300;

export default async function MenuPage() {
  const { items, categories } = await getPublicMenu();

  // Resolve branch_id for ordering (single-tenant: pick lowest-id branch deterministically)
  const supabase = await createSupabaseServer();
  const { data: branch } = await supabase
    .from("branches")
    .select("id")
    .order("id", { ascending: true })
    .limit(1)
    .single();

  const branchId = branch?.id ?? null;

  return (
    <MenuPageClient branchId={branchId}>
      <MenuBrowser items={items} categories={categories} />
    </MenuPageClient>
  );
}

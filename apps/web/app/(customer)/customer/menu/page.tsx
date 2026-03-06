import type { Metadata } from "next";
import { getPublicMenu } from "../actions";
import { MenuBrowser } from "./menu-browser";
import { MenuPageClient } from "./menu-page-client";

export const metadata: Metadata = {
  title: "Thực đơn - Cơm tấm Má Tư",
};

export default async function MenuPage() {
  const { items, categories } = await getPublicMenu();

  // Resolve branch_id for ordering (single-tenant: first branch)
  const { createSupabaseServer } = await import("@comtammatu/database");
  const supabase = await createSupabaseServer();
  const { data: branch } = await supabase
    .from("branches")
    .select("id")
    .limit(1)
    .single();

  const branchId = branch?.id ?? 0;

  return (
    <MenuPageClient branchId={branchId}>
      <MenuBrowser items={items} categories={categories} />
    </MenuPageClient>
  );
}

import { Header } from "@/components/admin/header";
import { getMenuItems, getCategories } from "../actions";
import { createSupabaseServer } from "@comtammatu/database";
import { notFound } from "next/navigation";
import { MenuDetail } from "./menu-detail";

interface Props {
  params: Promise<{ menuId: string }>;
}

export default async function MenuDetailPage({ params }: Props) {
  const { menuId } = await params;
  const menuIdNum = parseInt(menuId, 10);

  if (isNaN(menuIdNum)) notFound();

  // Fetch menu info
  const supabase = await createSupabaseServer();
  const { data: menu } = await supabase
    .from("menus")
    .select("*")
    .eq("id", menuIdNum)
    .single();

  if (!menu) notFound();

  const categories = await getCategories(menuIdNum);

  // Fetch items for all categories
  const categoriesWithItems = await Promise.all(
    categories.map(async (cat) => {
      const items = await getMenuItems(cat.id);
      return { ...cat, items };
    }),
  );

  return (
    <>
      <Header
        breadcrumbs={[
          { label: "Thực đơn", href: "/admin/menu" },
          { label: menu.name },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <MenuDetail
          menu={menu}
          categories={categoriesWithItems}
        />
      </div>
    </>
  );
}

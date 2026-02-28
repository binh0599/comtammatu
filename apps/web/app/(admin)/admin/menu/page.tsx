import { Header } from "@/components/admin/header";
import { getMenus } from "./actions";
import { MenusTable } from "./menus-table";

export default async function MenuPage() {
  const menus = await getMenus();

  return (
    <>
      <Header breadcrumbs={[{ label: "Thực đơn" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <MenusTable menus={menus} />
      </div>
    </>
  );
}

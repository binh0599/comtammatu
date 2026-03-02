import type { Metadata } from "next";
import { getPublicMenu } from "../actions";
import { MenuBrowser } from "./menu-browser";

export const metadata: Metadata = {
  title: "Thực đơn - Com Tấm Mã Tú",
};

export default async function MenuPage() {
  const { items, categories } = await getPublicMenu();

  return <MenuBrowser items={items} categories={categories} />;
}

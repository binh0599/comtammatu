import { getPublicMenu } from "../actions";
import { MenuBrowser } from "./menu-browser";

export default async function MenuPage() {
  const { items, categories } = await getPublicMenu();

  return <MenuBrowser items={items} categories={categories} />;
}

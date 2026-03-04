import { Header } from "@/components/admin/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getIngredients,
  getBranches,
  getStockLevels,
  getStockMovements,
  getRecipes,
  getMenuItemsForRecipe,
  getSuppliers,
  getPurchaseOrders,
} from "./actions";
import { IngredientsTab } from "./ingredients-tab";
import { StockLevelsTab } from "./stock-levels-tab";
import { StockMovementsTab } from "./stock-movements-tab";
import { RecipesTab } from "./recipes-tab";
import { SuppliersTab } from "./suppliers-tab";
import { PurchaseOrdersTab } from "./purchase-orders-tab";

export default async function InventoryPage() {
  const [
    ingredients,
    branches,
    stockLevels,
    movements,
    recipes,
    menuItems,
    suppliers,
    purchaseOrders,
  ] = await Promise.all([
    getIngredients(),
    getBranches(),
    getStockLevels(),
    getStockMovements(),
    getRecipes(),
    getMenuItemsForRecipe(),
    getSuppliers(),
    getPurchaseOrders(),
  ]);

  return (
    <>
      <Header breadcrumbs={[{ label: "Kho hàng" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs defaultValue="ingredients" className="w-full">
          <TabsList>
            <TabsTrigger value="ingredients">Nguyên liệu</TabsTrigger>
            <TabsTrigger value="stock">Tồn kho</TabsTrigger>
            <TabsTrigger value="movements">Nhập/Xuất</TabsTrigger>
            <TabsTrigger value="recipes">Công thức</TabsTrigger>
            <TabsTrigger value="suppliers">Nhà cung cấp</TabsTrigger>
            <TabsTrigger value="purchase-orders">Đơn mua hàng</TabsTrigger>
          </TabsList>
          <TabsContent value="ingredients">
            <IngredientsTab ingredients={ingredients} />
          </TabsContent>
          <TabsContent value="stock">
            <StockLevelsTab
              stockLevels={stockLevels}
              ingredients={ingredients}
              branches={branches}
            />
          </TabsContent>
          <TabsContent value="movements">
            <StockMovementsTab
              movements={movements}
              ingredients={ingredients}
              branches={branches}
            />
          </TabsContent>
          <TabsContent value="recipes">
            <RecipesTab
              recipes={recipes}
              ingredients={ingredients}
              availableMenuItems={menuItems}
            />
          </TabsContent>
          <TabsContent value="suppliers">
            <SuppliersTab suppliers={suppliers} />
          </TabsContent>
          <TabsContent value="purchase-orders">
            <PurchaseOrdersTab
              purchaseOrders={purchaseOrders}
              suppliers={suppliers}
              ingredients={ingredients}
              branches={branches}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

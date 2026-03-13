import { Header } from "@/components/admin/header";
import {
  getIngredients,
  getBranches,
  getStockLevels,
  getStockMovements,
  getRecipes,
  getMenuItemsForRecipe,
  getSuppliers,
  getPurchaseOrders,
  getPrepList,
  getStockCounts,
  getExpiringBatches,
  getPriceAnomalies,
} from "./actions";
import { IngredientsTab } from "./ingredients-tab";
import { StockLevelsTab } from "./stock-levels-tab";
import { StockMovementsTab } from "./stock-movements-tab";
import { RecipesTab } from "./recipes-tab";
import { SuppliersTab } from "./suppliers-tab";
import { PurchaseOrdersTab } from "./purchase-orders-tab";
import { PrepListTab } from "./prep-list-tab";
import { StockCountTab } from "./stock-count-tab";
import { FoodCostTab } from "./food-cost-tab";
import { ExpiryTab } from "./expiry-tab";
import { ForecastTab } from "./forecast-tab";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@comtammatu/ui";

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
    prepList,
    stockCounts,
    expiringBatches,
    priceAnomalies,
  ] = await Promise.all([
    getIngredients(),
    getBranches(),
    getStockLevels(),
    getStockMovements(),
    getRecipes(),
    getMenuItemsForRecipe(),
    getSuppliers(),
    getPurchaseOrders(),
    getPrepList(),
    getStockCounts(),
    getExpiringBatches(),
    getPriceAnomalies(),
  ]);

  return (
    <>
      <Header breadcrumbs={[{ label: "Kho hàng" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs defaultValue="ingredients" className="w-full">
          <TabsList className="flex-wrap">
            <TabsTrigger value="ingredients">Nguyên liệu</TabsTrigger>
            <TabsTrigger value="stock">Tồn kho</TabsTrigger>
            <TabsTrigger value="movements">Nhập/Xuất</TabsTrigger>
            <TabsTrigger value="recipes">Công thức</TabsTrigger>
            <TabsTrigger value="suppliers">Nhà cung cấp</TabsTrigger>
            <TabsTrigger value="purchase-orders">Đơn mua hàng</TabsTrigger>
            <TabsTrigger value="prep-list">Chuẩn bị</TabsTrigger>
            <TabsTrigger value="stock-count">Kiểm kho</TabsTrigger>
            <TabsTrigger value="food-cost">Food Cost</TabsTrigger>
            <TabsTrigger value="expiry">Hạn sử dụng</TabsTrigger>
            <TabsTrigger value="forecast">Dự báo</TabsTrigger>
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
              priceAnomalies={priceAnomalies}
            />
          </TabsContent>
          <TabsContent value="prep-list">
            <PrepListTab initialData={prepList} />
          </TabsContent>
          <TabsContent value="stock-count">
            <StockCountTab
              stockCounts={stockCounts}
              ingredients={ingredients}
            />
          </TabsContent>
          <TabsContent value="food-cost">
            <FoodCostTab />
          </TabsContent>
          <TabsContent value="expiry">
            <ExpiryTab initialData={expiringBatches} />
          </TabsContent>
          <TabsContent value="forecast">
            <ForecastTab branches={branches} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

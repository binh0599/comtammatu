"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatPrice } from "@comtammatu/shared";

interface MenuItem {
  id: number;
  name: string;
  base_price: number;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
  category_id: number;
  menu_categories: { id: number; name: string; menu_id: number } | null;
  menu_item_variants:
    | { id: number; name: string; price_adjustment: number; is_available: boolean }[]
    | null;
}

interface Category {
  id: number;
  name: string;
  menu_id: number;
}

export interface CartItem {
  menu_item_id: number;
  name: string;
  variant_id: number | null;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  notes: string;
}

export function MenuSelector({
  menuItems,
  categories,
  cart,
  onAddItem,
  onRemoveItem,
}: {
  menuItems: MenuItem[];
  categories: Category[];
  cart: CartItem[];
  onAddItem: (item: CartItem) => void;
  onRemoveItem: (menuItemId: number, variantId: number | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(
    null
  );

  const filteredItems = useMemo(() => {
    let items = menuItems;

    if (activeCategoryId) {
      items = items.filter((i) => i.category_id === activeCategoryId);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.description?.toLowerCase().includes(q) ?? false)
      );
    }

    return items;
  }, [menuItems, activeCategoryId, search]);

  function getCartQuantity(menuItemId: number, variantId: number | null) {
    return (
      cart.find(
        (c) =>
          c.menu_item_id === menuItemId && c.variant_id === variantId
      )?.quantity ?? 0
    );
  }

  function handleAdd(item: MenuItem, variantId?: number | null) {
    const variant = variantId
      ? item.menu_item_variants?.find((v) => v.id === variantId)
      : null;

    const unitPrice =
      item.base_price + (variant?.price_adjustment ?? 0);

    onAddItem({
      menu_item_id: item.id,
      name: item.name,
      variant_id: variant?.id ?? null,
      variant_name: variant?.name ?? null,
      quantity: 1,
      unit_price: unitPrice,
      notes: "",
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Tìm món..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category tabs */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          <Button
            variant={activeCategoryId === null ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategoryId(null)}
            className="shrink-0"
          >
            Tất cả
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={activeCategoryId === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategoryId(cat.id)}
              className="shrink-0"
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </ScrollArea>

      {/* Menu items grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {filteredItems.map((item) => {
          const hasVariants =
            item.menu_item_variants && item.menu_item_variants.length > 0;
          const qty = getCartQuantity(item.id, null);

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-primary text-sm font-semibold">
                  {formatPrice(item.base_price)}
                </p>
                {hasVariants && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.menu_item_variants!.map((v) => {
                      const vQty = getCartQuantity(item.id, v.id);
                      return (
                        <Badge
                          key={v.id}
                          variant={vQty > 0 ? "default" : "outline"}
                          className="cursor-pointer text-xs"
                          onClick={() => handleAdd(item, v.id)}
                        >
                          {v.name}
                          {v.price_adjustment > 0 &&
                            ` +${formatPrice(v.price_adjustment)}`}
                          {vQty > 0 && ` (${vQty})`}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              {!hasVariants && (
                <div className="flex items-center gap-1">
                  {qty > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onRemoveItem(item.id, null)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">
                        {qty}
                      </span>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleAdd(item)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-muted-foreground py-8 text-center text-sm">
          Không tìm thấy món nào
        </div>
      )}
    </div>
  );
}

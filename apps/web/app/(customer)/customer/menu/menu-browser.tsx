"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Search, UtensilsCrossed, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatPrice, MENU_CATEGORY_TYPE_LABELS } from "@comtammatu/shared";
import { useCart } from "./cart-context";

interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  category_id: number;
  allergens: string[] | null;
  menu_categories: {
    id: number;
    name: string;
    sort_order: number | null;
    type: string;
  } | null;
}

interface MenuCategory {
  id: number;
  name: string;
  sort_order: number | null;
  type: string;
}

interface MenuBrowserProps {
  items: MenuItem[];
  categories: MenuCategory[];
}

export function MenuBrowser({ items, categories }: MenuBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const { addItem } = useCart();

  const filteredItems = useMemo(() => {
    let result = items;

    if (selectedCategory !== null) {
      result = result.filter((item) => item.category_id === selectedCategory);
    }

    if (searchText.trim()) {
      const query = searchText.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.description?.toLowerCase().includes(query) ?? false)
      );
    }

    return result;
  }, [items, selectedCategory, searchText]);

  // Group filtered items by category type for display
  const groupedItems = useMemo(() => {
    const groups: { type: string; label: string; items: MenuItem[] }[] = [];

    const mainItems = filteredItems.filter(
      (i) => i.menu_categories?.type === "main_dish"
    );
    if (mainItems.length > 0) {
      groups.push({ type: "main_dish", label: MENU_CATEGORY_TYPE_LABELS.main_dish, items: mainItems });
    }

    const sideItems = filteredItems.filter(
      (i) => i.menu_categories?.type === "side_dish"
    );
    if (sideItems.length > 0) {
      groups.push({ type: "side_dish", label: MENU_CATEGORY_TYPE_LABELS.side_dish, items: sideItems });
    }

    const drinkItems = filteredItems.filter(
      (i) => i.menu_categories?.type === "drink"
    );
    if (drinkItems.length > 0) {
      groups.push({ type: "drink", label: MENU_CATEGORY_TYPE_LABELS.drink, items: drinkItems });
    }

    return groups;
  }, [filteredItems]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Thực đơn</h1>

      {/* Search bar */}
      <div className="relative">
        <Search
          aria-hidden="true"
          className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
        />
        <Input
          aria-label="Tìm món ăn"
          placeholder="Tìm món ăn..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category tabs — horizontal scrollable */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            aria-pressed={selectedCategory === null}
            className={cn(
              "inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium transition-colors",
              selectedCategory === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent border-border"
            )}
          >
            Tất cả
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              aria-pressed={selectedCategory === cat.id}
              className={cn(
                "inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium transition-colors",
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-accent border-border"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Menu items grouped by type */}
      {groupedItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <UtensilsCrossed className="text-muted-foreground h-12 w-12" />
          <p className="text-muted-foreground text-sm">
            Không tìm thấy món ăn nào
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedItems.map((group) => (
            <div key={group.type}>
              <h2 className="mb-3 text-lg font-semibold">{group.label}</h2>
              <div className="grid gap-3">
                {group.items.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="flex gap-4 p-4">
                      {/* Image placeholder */}
                      <div className="bg-muted flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            width={80}
                            height={80}
                            className="h-full w-full rounded-lg object-cover"
                          />
                        ) : (
                          <UtensilsCrossed className="text-muted-foreground h-8 w-8" />
                        )}
                      </div>

                      {/* Text info */}
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <h3 className="font-medium leading-tight">{item.name}</h3>
                          {item.description && (
                            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-primary font-semibold">
                              {formatPrice(item.base_price)}
                            </span>
                            {item.allergens && item.allergens.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {item.allergens.join(", ")}
                              </Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 shrink-0 gap-1"
                            onClick={() =>
                              addItem({
                                menuItemId: item.id,
                                name: item.name,
                                price: item.base_price,
                              })
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span className="text-xs">Thêm</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

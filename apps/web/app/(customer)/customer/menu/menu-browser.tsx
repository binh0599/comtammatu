"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Search, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatPrice } from "@comtammatu/shared";

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
  } | null;
}

interface MenuCategory {
  id: number;
  name: string;
  sort_order: number | null;
}

interface MenuBrowserProps {
  items: MenuItem[];
  categories: MenuCategory[];
}

export function MenuBrowser({ items, categories }: MenuBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");

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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Thuc don</h1>

      {/* Search bar */}
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Tim mon an..."
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
            className={cn(
              "inline-flex min-h-[36px] items-center rounded-full border px-4 text-sm font-medium transition-colors",
              selectedCategory === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent border-border"
            )}
          >
            Tat ca
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "inline-flex min-h-[36px] items-center rounded-full border px-4 text-sm font-medium transition-colors",
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

      {/* Menu items list */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <UtensilsCrossed className="text-muted-foreground h-12 w-12" />
          <p className="text-muted-foreground text-sm">
            Khong tim thay mon an nao
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredItems.map((item) => (
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
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-primary font-semibold">
                      {formatPrice(item.base_price)}
                    </span>
                    {item.allergens && item.allergens.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {item.allergens.join(", ")}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

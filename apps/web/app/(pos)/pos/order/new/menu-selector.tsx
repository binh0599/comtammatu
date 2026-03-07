"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Minus, MessageSquare, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice, MENU_CATEGORY_TYPE_LABELS } from "@comtammatu/shared";

interface MenuItem {
  id: number;
  name: string;
  base_price: number;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
  category_id: number;
  menu_categories: { id: number; name: string; menu_id: number; type: string } | null;
  menu_item_variants:
    | { id: number; name: string; price_adjustment: number; is_available: boolean }[]
    | null;
  available_side_ids: number[];
}

interface Category {
  id: number;
  name: string;
  menu_id: number;
  type: string;
}

export interface CartItem {
  menu_item_id: number;
  name: string;
  variant_id: number | null;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  notes: string;
  side_items: CartSideItem[];
}

export interface CartSideItem {
  menu_item_id: number;
  name: string;
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
  onUpdateItemNotes,
}: {
  menuItems: MenuItem[];
  categories: Category[];
  cart: CartItem[];
  onAddItem: (item: CartItem) => void;
  onRemoveItem: (menuItemId: number, variantId: number | null) => void;
  onUpdateItemNotes: (menuItemId: number, variantId: number | null, notes: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(
    null
  );
  const [sidesDialogItem, setSidesDialogItem] = useState<MenuItem | null>(null);
  const [sidesDialogVariantId, setSidesDialogVariantId] = useState<number | null>(null);
  const [sidesDialogVariantPrice, setSidesDialogVariantPrice] = useState<number>(0);
  const [selectedSides, setSelectedSides] = useState<Map<number, number>>(new Map());
  const [notesDialogKey, setNotesDialogKey] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  // Build a map of side item id -> side item data for quick lookup
  const sideItemsMap = useMemo(() => {
    const map = new Map<number, MenuItem>();
    for (const item of menuItems) {
      const catType = item.menu_categories?.type;
      if (catType === "side_dish") {
        map.set(item.id, item);
      }
    }
    return map;
  }, [menuItems]);

  // Filter: show all orderable items (main_dish, drink, side_dish)
  const filteredItems = useMemo(() => {
    let items = [...menuItems];

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

  // All categories are visible (main_dish, drink, side_dish)
  const visibleCategories = categories;

  function getCartQuantity(menuItemId: number, variantId: number | null) {
    return (
      cart.find(
        (c) =>
          c.menu_item_id === menuItemId && c.variant_id === variantId
      )?.quantity ?? 0
    );
  }

  function getCartItem(menuItemId: number, variantId: number | null) {
    return cart.find(
      (c) => c.menu_item_id === menuItemId && c.variant_id === variantId
    );
  }

  function handleAdd(item: MenuItem, variantId?: number | null) {
    const variant = variantId
      ? item.menu_item_variants?.find((v) => v.id === variantId)
      : null;

    const unitPrice =
      item.base_price + (variant?.price_adjustment ?? 0);

    // If this main dish has available sides, open sides dialog
    if (
      item.available_side_ids.length > 0 &&
      item.menu_categories?.type === "main_dish" &&
      getCartQuantity(item.id, variant?.id ?? null) === 0
    ) {
      setSidesDialogItem(item);
      setSidesDialogVariantId(variant?.id ?? null);
      setSidesDialogVariantPrice(variant?.price_adjustment ?? 0);
      setSelectedSides(new Map());
      return;
    }

    onAddItem({
      menu_item_id: item.id,
      name: item.name,
      variant_id: variant?.id ?? null,
      variant_name: variant?.name ?? null,
      quantity: 1,
      unit_price: unitPrice,
      notes: "",
      side_items: [],
    });
  }

  function handleConfirmSides() {
    if (!sidesDialogItem) return;

    const variant = sidesDialogVariantId
      ? sidesDialogItem.menu_item_variants?.find((v) => v.id === sidesDialogVariantId)
      : null;
    const unitPrice = sidesDialogItem.base_price + sidesDialogVariantPrice;

    const sideItems: CartSideItem[] = [];
    for (const [sideId, qty] of selectedSides) {
      if (qty <= 0) continue;
      const sideMenuItem = sideItemsMap.get(sideId);
      if (!sideMenuItem) continue;
      sideItems.push({
        menu_item_id: sideMenuItem.id,
        name: sideMenuItem.name,
        quantity: qty,
        unit_price: sideMenuItem.base_price,
        notes: "",
      });
    }

    onAddItem({
      menu_item_id: sidesDialogItem.id,
      name: sidesDialogItem.name,
      variant_id: sidesDialogVariantId,
      variant_name: variant?.name ?? null,
      quantity: 1,
      unit_price: unitPrice,
      notes: "",
      side_items: sideItems,
    });

    setSidesDialogItem(null);
    setSidesDialogVariantId(null);
    setSidesDialogVariantPrice(0);
    setSelectedSides(new Map());
  }

  function toggleSide(sideId: number) {
    setSelectedSides((prev) => {
      const next = new Map(prev);
      if (next.has(sideId)) {
        next.delete(sideId);
      } else {
        next.set(sideId, 1);
      }
      return next;
    });
  }

  function openNotesDialog(menuItemId: number, variantId: number | null) {
    const key = `${menuItemId}-${variantId ?? "base"}`;
    const existing = getCartItem(menuItemId, variantId);
    setNotesText(existing?.notes ?? "");
    setNotesDialogKey(key);
  }

  function handleSaveNotes() {
    if (!notesDialogKey) return;
    const [menuItemIdStr, variantIdStr] = notesDialogKey.split("-");
    const menuItemId = Number(menuItemIdStr);
    const variantId = variantIdStr === "base" ? null : Number(variantIdStr);
    onUpdateItemNotes(menuItemId, variantId, notesText);
    setNotesDialogKey(null);
    setNotesText("");
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" aria-hidden="true" />
        <Input
          placeholder="Tìm món..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Tìm kiếm món ăn"
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
          {visibleCategories.map((cat) => (
            <Button
              key={cat.id}
              variant={activeCategoryId === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategoryId(cat.id)}
              className="shrink-0"
            >
              {cat.name}
              {cat.type === "drink" && (
                <span className="text-muted-foreground ml-1 text-xs">
                  ({MENU_CATEGORY_TYPE_LABELS.drink})
                </span>
              )}
            </Button>
          ))}
        </div>
      </ScrollArea>

      {/* Menu items grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {filteredItems.map((item) => {
          const hasVariants =
            item.menu_item_variants && item.menu_item_variants.length > 0;
          const baseQty = getCartQuantity(item.id, null);
          const baseCartItem = getCartItem(item.id, null);
          const hasSides = item.available_side_ids.length > 0;
          const catType = item.menu_categories?.type;

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate font-medium">{item.name}</p>
                  {hasSides && catType === "main_dish" && (
                    <Badge variant="outline" className="shrink-0 text-xs">
                      +kèm
                    </Badge>
                  )}
                </div>
                <p className="text-primary text-sm font-semibold">
                  {formatPrice(item.base_price)}
                </p>
                {hasVariants && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.menu_item_variants!.map((v) => {
                      const vQty = getCartQuantity(item.id, v.id);
                      const vCartItem = getCartItem(item.id, v.id);
                      return (
                        <div key={v.id} className="flex items-center gap-1">
                          <button
                            onClick={() => handleAdd(item, v.id)}
                            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                              vQty > 0
                                ? "bg-primary text-primary-foreground"
                                : "border border-input bg-background"
                            }`}
                            aria-label={`Thêm ${v.name}${v.price_adjustment > 0 ? ` +${formatPrice(v.price_adjustment)}` : ""}${vQty > 0 ? `, ${vQty} trong giỏ` : ""}`}
                          >
                            {v.name}
                            {v.price_adjustment > 0 &&
                              ` +${formatPrice(v.price_adjustment)}`}
                            {vQty > 0 && ` (${vQty})`}
                          </button>
                          {vQty > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => openNotesDialog(item.id, v.id)}
                              aria-label={`Ghi chú cho ${item.name} ${v.name}`}
                              title="Ghi chú cho bếp"
                            >
                              <MessageSquare className={`size-3 ${vCartItem?.notes ? "text-primary" : ""}`} aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Show side items in cart (base item) */}
                {baseCartItem && baseCartItem.side_items.length > 0 && (
                  <div className="text-muted-foreground mt-1 text-xs">
                    Kèm: {baseCartItem.side_items.map((s) => s.name).join(", ")}
                  </div>
                )}
                {/* Show notes indicator (base item) */}
                {baseCartItem?.notes && (
                  <div className="text-muted-foreground mt-0.5 text-xs italic">
                    &quot;{baseCartItem.notes}&quot;
                  </div>
                )}
                {/* Show variant-level sides and notes */}
                {hasVariants && item.menu_item_variants!.map((v) => {
                  const vCartItem = getCartItem(item.id, v.id);
                  if (!vCartItem) return null;
                  return (
                    <div key={`info-${v.id}`}>
                      {vCartItem.side_items.length > 0 && (
                        <div className="text-muted-foreground mt-1 text-xs">
                          {v.name} kèm: {vCartItem.side_items.map((s) => s.name).join(", ")}
                        </div>
                      )}
                      {vCartItem.notes && (
                        <div className="text-muted-foreground mt-0.5 text-xs italic">
                          {v.name}: &quot;{vCartItem.notes}&quot;
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-1">
                {/* Notes button (base item, no variants) */}
                {!hasVariants && baseQty > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => openNotesDialog(item.id, null)}
                    aria-label={`Ghi chú cho ${item.name}`}
                    title="Ghi chú cho bếp"
                  >
                    <MessageSquare className={`size-3.5 ${baseCartItem?.notes ? "text-primary" : ""}`} aria-hidden="true" />
                  </Button>
                )}

                {!hasVariants && (
                  <>
                    {baseQty > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-11"
                          onClick={() => onRemoveItem(item.id, null)}
                          aria-label={`Bớt ${item.name}`}
                        >
                          <Minus className="size-3" aria-hidden="true" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">
                          {baseQty}
                        </span>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-11"
                      onClick={() => handleAdd(item)}
                      aria-label={`Thêm ${item.name}`}
                    >
                      <Plus className="size-3" aria-hidden="true" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-muted-foreground py-8 text-center text-sm">
          Không tìm thấy món nào
        </div>
      )}

      {/* Sides selection dialog */}
      <Dialog
        open={sidesDialogItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSidesDialogItem(null);
            setSelectedSides(new Map());
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Chọn món kèm cho {sidesDialogItem?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {sidesDialogItem?.available_side_ids.map((sideId) => {
              const side = sideItemsMap.get(sideId);
              if (!side) return null;
              const isSelected = selectedSides.has(sideId);
              return (
                <label
                  key={sideId}
                  className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSide(sideId)}
                  />
                  <span className="flex-1 font-medium">{side.name}</span>
                  <span className="text-muted-foreground text-sm">
                    +{formatPrice(side.base_price)}
                  </span>
                </label>
              );
            })}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                // Add without sides
                if (sidesDialogItem) {
                  onAddItem({
                    menu_item_id: sidesDialogItem.id,
                    name: sidesDialogItem.name,
                    variant_id: null,
                    variant_name: null,
                    quantity: 1,
                    unit_price: sidesDialogItem.base_price,
                    notes: "",
                    side_items: [],
                  });
                  setSidesDialogItem(null);
                  setSelectedSides(new Map());
                }
              }}
            >
              Không kèm
            </Button>
            <Button onClick={handleConfirmSides}>
              <Check className="mr-1 size-4" />
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes dialog */}
      <Dialog
        open={notesDialogKey !== null}
        onOpenChange={(open) => {
          if (!open) {
            setNotesDialogKey(null);
            setNotesText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ghi chú cho bếp</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="VD: ít cơm, thêm muối, không hành..."
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            maxLength={200}
            rows={3}
          />
          <p className="text-muted-foreground text-xs">
            {notesText.length}/200 ký tự
          </p>
          <DialogFooter>
            <Button onClick={handleSaveNotes}>Lưu ghi chú</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

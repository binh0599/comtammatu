"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import {
  Package,
  AlertTriangle,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getWasteReasonLabel } from "@comtammatu/shared";
import {
  toggleMenuItemAvailability,
  logWaste,
  getMenuPortions,
  type MenuPortionInfo,
  type IngredientOption,
} from "../inventory-actions";

// ===== Low Stock Threshold =====
const LOW_PORTION_THRESHOLD = 10;
const CRITICAL_PORTION_THRESHOLD = 3;

// ===== Portion Badge Component =====
function PortionBadge({ portions }: { portions: number }) {
  if (portions <= CRITICAL_PORTION_THRESHOLD) {
    return (
      <Badge variant="destructive" className="text-xs font-bold">
        {portions} phần
      </Badge>
    );
  }
  if (portions <= LOW_PORTION_THRESHOLD) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 text-xs font-bold">
        {portions} phần
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs">
      {portions} phần
    </Badge>
  );
}

// ===== Menu Item Row =====
function MenuItemRow({
  item,
  onToggle,
}: {
  item: MenuPortionInfo;
  onToggle: (
    menuItemId: number,
    isAvailable: boolean,
    reason?: string,
  ) => void;
}) {
  const isDisabledGlobal = !item.is_available_global;
  const isDisabledBranch = !item.is_available_branch;
  const isDisabled = isDisabledGlobal || isDisabledBranch;

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
        isDisabled ? "border-red-300 bg-red-50" : "border-border"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium truncate ${
              isDisabled ? "text-red-700 line-through" : "text-foreground"
            }`}
          >
            {item.menu_item_name}
          </span>
          {isDisabledGlobal && (
            <Badge variant="destructive" className="text-[10px] shrink-0">
              Tắt toàn chuỗi
            </Badge>
          )}
        </div>
        {item.portions_remaining <= LOW_PORTION_THRESHOLD &&
          item.limiting_ingredient_name && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Thiếu: {item.limiting_ingredient_name}
            </p>
          )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <PortionBadge portions={item.portions_remaining} />

        {/* Toggle button — only for branch-level */}
        {!isDisabledGlobal && (
          <Button
            size="sm"
            variant={isDisabledBranch ? "default" : "destructive"}
            className="h-7 px-2 text-xs"
            onClick={() =>
              onToggle(
                item.menu_item_id,
                !item.is_available_branch,
                isDisabledBranch ? undefined : "out_of_stock",
              )
            }
          >
            {isDisabledBranch ? "Bật lại" : "Hết món"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ===== Waste Log Dialog =====
function WasteLogDialog({
  open,
  onOpenChange,
  ingredients,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredients: IngredientOption[];
  onSubmit: (
    ingredientId: number,
    quantity: number,
    reason: "expired" | "spoiled" | "overproduction" | "other",
    notes?: string,
  ) => Promise<void>;
}) {
  const [ingredientId, setIngredientId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedIngredient = ingredients.find(
    (i) => i.id === Number(ingredientId),
  );

  function handleSubmit() {
    if (!ingredientId || !quantity || !reason) return;
    startTransition(async () => {
      await onSubmit(
        Number(ingredientId),
        Number(quantity),
        reason as "expired" | "spoiled" | "overproduction" | "other",
        notes || undefined,
      );
      setIngredientId("");
      setQuantity("");
      setReason("");
      setNotes("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ghi nhận hao hụt</DialogTitle>
          <DialogDescription>
            Ghi nhận nguyên liệu hao hụt, hư hỏng hoặc hết hạn
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nguyên liệu</Label>
            <Select value={ingredientId} onValueChange={setIngredientId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn nguyên liệu..." />
              </SelectTrigger>
              <SelectContent>
                {ingredients.map((ing) => (
                  <SelectItem key={ing.id} value={String(ing.id)}>
                    {ing.name} ({ing.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Số lượng{" "}
              {selectedIngredient && (
                <span className="text-muted-foreground">
                  ({selectedIngredient.unit})
                </span>
              )}
            </Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Nhập số lượng..."
            />
          </div>

          <div className="space-y-2">
            <Label>Lý do</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn lý do..." />
              </SelectTrigger>
              <SelectContent>
                {(
                  ["expired", "spoiled", "overproduction", "other"] as const
                ).map((r) => (
                  <SelectItem key={r} value={r}>
                    {getWasteReasonLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ghi chú (tùy chọn)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Thêm ghi chú..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !ingredientId || !quantity || !reason}
          >
            {isPending ? "Đang lưu..." : "Ghi nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Main Inventory Panel =====
export function InventoryPanel({
  initialPortions,
  ingredients,
}: {
  initialPortions: MenuPortionInfo[];
  ingredients: IngredientOption[];
}) {
  const [portions, setPortions] = useState(initialPortions);
  const [isExpanded, setIsExpanded] = useState(false);
  const [wasteDialogOpen, setWasteDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Refresh portions periodically (every 60s)
  useEffect(() => {
    const interval = setInterval(() => {
      getMenuPortions()
        .then(setPortions)
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const lowStockItems = portions.filter(
    (p) => p.portions_remaining <= LOW_PORTION_THRESHOLD,
  );
  const unavailableItems = portions.filter(
    (p) => !p.is_available_global || !p.is_available_branch,
  );

  const handleToggle = useCallback(
    (menuItemId: number, isAvailable: boolean, reason?: string) => {
      startTransition(async () => {
        const result = await toggleMenuItemAvailability(
          menuItemId,
          isAvailable,
          reason,
        );
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(
          isAvailable
            ? "Đã bật lại món tại chi nhánh"
            : "Đã tắt món tại chi nhánh",
        );
        // Refresh portions
        const updated = await getMenuPortions();
        setPortions(updated);
      });
    },
    [toast],
  );

  const handleWasteSubmit = useCallback(
    async (
      ingredientId: number,
      quantity: number,
      reason: "expired" | "spoiled" | "overproduction" | "other",
      notes?: string,
    ) => {
      const result = await logWaste(ingredientId, quantity, reason, notes);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Đã ghi nhận hao hụt");
      // Refresh portions
      const updated = await getMenuPortions();
      setPortions(updated);
    },
    [toast],
  );

  // Summary badge count
  const alertCount = lowStockItems.length + unavailableItems.length;

  return (
    <>
      {/* Collapsed bar */}
      <div className="border-b border-border bg-background px-4 py-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            <Package className="h-4 w-4" />
            <span>Kho hàng</span>
            {alertCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {alertCount}
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          <div className="flex items-center gap-2">
            {/* Quick alert badges when collapsed */}
            {!isExpanded && lowStockItems.length > 0 && (
              <div className="flex gap-1">
                {lowStockItems.slice(0, 3).map((item) => (
                  <Badge
                    key={item.menu_item_id}
                    variant={
                      item.portions_remaining <= CRITICAL_PORTION_THRESHOLD
                        ? "destructive"
                        : "outline"
                    }
                    className="text-[10px]"
                  >
                    {item.menu_item_name}: {item.portions_remaining}
                  </Badge>
                ))}
                {lowStockItems.length > 3 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{lowStockItems.length - 3}
                  </Badge>
                )}
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => setWasteDialogOpen(true)}
            >
              <Trash2 className="h-3 w-3" />
              Hao hụt
            </Button>
          </div>
        </div>

        {/* Expanded panel */}
        {isExpanded && (
          <div className="mt-3 space-y-3 pb-1">
            {/* Unavailable items section */}
            {unavailableItems.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-red-700 uppercase mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Đã tắt ({unavailableItems.length})
                </h4>
                <div className="space-y-1">
                  {unavailableItems.map((item) => (
                    <MenuItemRow
                      key={item.menu_item_id}
                      item={item}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Low stock items */}
            {lowStockItems.filter(
              (i) => i.is_available_global && i.is_available_branch,
            ).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-yellow-700 uppercase mb-1.5">
                  Sắp hết ({lowStockItems.filter((i) => i.is_available_global && i.is_available_branch).length})
                </h4>
                <div className="space-y-1">
                  {lowStockItems
                    .filter(
                      (i) => i.is_available_global && i.is_available_branch,
                    )
                    .map((item) => (
                      <MenuItemRow
                        key={item.menu_item_id}
                        item={item}
                        onToggle={handleToggle}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* All items */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                Tất cả món ({portions.length})
              </h4>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {portions
                  .filter(
                    (i) =>
                      i.is_available_global &&
                      i.is_available_branch &&
                      i.portions_remaining > LOW_PORTION_THRESHOLD,
                  )
                  .map((item) => (
                    <MenuItemRow
                      key={item.menu_item_id}
                      item={item}
                      onToggle={handleToggle}
                    />
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Waste log dialog */}
      <WasteLogDialog
        open={wasteDialogOpen}
        onOpenChange={setWasteDialogOpen}
        ingredients={ingredients}
        onSubmit={handleWasteSubmit}
      />
    </>
  );
}

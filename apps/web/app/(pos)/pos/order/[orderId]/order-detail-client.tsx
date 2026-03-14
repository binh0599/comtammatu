"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  Banknote,
  Trash2,
  Plus,
  Minus,
  ArrowRightLeft,
  Users,
  StickyNote,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { formatPrice, formatDateTime, getOrderStatusLabel } from "@comtammatu/shared";
import { ORDER_STATUS_VARIANT } from "@/lib/ui-constants";
import { toast } from "sonner";
import {
  confirmOrder,
  updateOrderStatus,
  removeOrderItem,
  updateOrderItem,
  transferOrderTable,
  updateGuestCount,
  updateOrderNotes,
  getTables,
} from "../../orders/actions";
import { ReceiptPrinter } from "../../components/receipt-printer";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
} from "@comtammatu/ui";

interface OrderDetail {
  id: number;
  order_number: string;
  status: string;
  type: string;
  subtotal: number;
  tax: number;
  service_charge: number;
  discount_total: number;
  total: number;
  notes: string | null;
  guest_count: number | null;
  created_at: string;
  table_id: number | null;
  tables: {
    number: number;
    zone_id: number;
    capacity?: number;
    branch_zones: { name: string } | null;
  } | null;
  order_items: {
    id: number;
    quantity: number;
    unit_price: number;
    item_total: number;
    status: string;
    notes: string | null;
    menu_items: { name: string; image_url: string | null } | null;
    menu_item_variants: { name: string } | null;
  }[];
  payments: {
    id: number;
    amount: number;
    method: string;
    status: string;
    paid_at: string | null;
  }[];
  order_status_history: {
    id: number;
    from_status: string | null;
    to_status: string;
    created_at: string;
  }[];
}

interface TableInfo {
  id: number;
  number: number;
  capacity: number;
  status: string;
  branch_zones: { name: string } | null;
}

/** Can the order be modified (items edited, notes changed, etc.)? */
function isEditable(status: string): boolean {
  return status === "draft" || status === "confirmed";
}

/** Is the order still active (not completed/cancelled)? */
function isActive(status: string): boolean {
  return !["completed", "cancelled"].includes(status);
}

/** Can this specific item be modified? */
function isItemEditable(orderStatus: string, itemStatus: string): boolean {
  return isEditable(orderStatus) && itemStatus === "pending";
}

export function OrderDetailClient({ order }: { order: OrderDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Table transfer dialog state
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [availableTables, setAvailableTables] = useState<TableInfo[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);

  // Guest count edit state
  const [editingGuests, setEditingGuests] = useState(false);
  const [guestInput, setGuestInput] = useState(String(order.guest_count ?? ""));

  // Notes edit state
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesInput, setNotesInput] = useState(order.notes ?? "");

  // -----------------------------------------------------------------------
  // Order-level actions
  // -----------------------------------------------------------------------

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmOrder(order.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã gửi bếp");
        router.refresh();
      }
    });
  }

  function handleStatusUpdate(newStatus: string) {
    startTransition(async () => {
      const result = await updateOrderStatus({
        order_id: order.id,
        status: newStatus,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Đã cập nhật: ${getOrderStatusLabel(newStatus)}`);
        router.refresh();
      }
    });
  }

  // -----------------------------------------------------------------------
  // Item actions
  // -----------------------------------------------------------------------

  function handleRemoveItem(itemId: number) {
    startTransition(async () => {
      const result = await removeOrderItem({
        order_id: order.id,
        item_id: itemId,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã xóa món");
        router.refresh();
      }
    });
  }

  function handleUpdateQty(itemId: number, currentQty: number, delta: number) {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      // Remove item when quantity reaches 0
      handleRemoveItem(itemId);
      return;
    }
    startTransition(async () => {
      const result = await updateOrderItem({
        order_id: order.id,
        item_id: itemId,
        quantity: newQty,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  }

  // -----------------------------------------------------------------------
  // Table transfer
  // -----------------------------------------------------------------------

  async function openTableTransfer() {
    setShowTableDialog(true);
    setSelectedTableId(null);
    setLoadingTables(true);
    try {
      const tables = await getTables();
      // Show available tables (exclude current table)
      const filtered = (tables as TableInfo[]).filter(
        (t) => t.id !== order.table_id && t.status !== "occupied"
      );
      setAvailableTables(filtered);
    } catch {
      toast.error("Không thể tải danh sách bàn");
    } finally {
      setLoadingTables(false);
    }
  }

  function handleTransferTable() {
    if (!selectedTableId) return;
    startTransition(async () => {
      const result = await transferOrderTable({
        order_id: order.id,
        new_table_id: selectedTableId,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã chuyển bàn thành công");
        setShowTableDialog(false);
        router.refresh();
      }
    });
  }

  // -----------------------------------------------------------------------
  // Guest count
  // -----------------------------------------------------------------------

  function handleSaveGuestCount() {
    const count = parseInt(guestInput, 10);
    if (isNaN(count) || count < 1 || count > 20) {
      toast.error("Số khách từ 1 đến 20");
      return;
    }
    startTransition(async () => {
      const result = await updateGuestCount({
        order_id: order.id,
        guest_count: count,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã cập nhật số khách");
        setEditingGuests(false);
        router.refresh();
      }
    });
  }

  // -----------------------------------------------------------------------
  // Notes
  // -----------------------------------------------------------------------

  function handleSaveNotes() {
    startTransition(async () => {
      const result = await updateOrderNotes({
        order_id: order.id,
        notes: notesInput.trim() || null,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã cập nhật ghi chú");
        setNotesOpen(false);
        router.refresh();
      }
    });
  }

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------

  const canEdit = isEditable(order.status);
  const orderActive = isActive(order.status);
  const hasPendingItems = order.order_items.some((i) => i.status === "pending");

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link href="/pos/orders">
          <Button variant="ghost" size="icon" aria-label="Quay lại danh sách đơn">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          <p className="text-muted-foreground text-sm">
            {formatDateTime(order.created_at)}
            {order.tables && (
              <>
                {" · "}
                Bàn {order.tables.number}
                {order.tables.branch_zones && (
                  <span className="text-muted-foreground"> ({order.tables.branch_zones.name})</span>
                )}
              </>
            )}
          </p>

          {/* Guest count (inline editable) */}
          {order.type === "dine_in" && (
            <div className="mt-1 flex items-center gap-1.5 text-sm">
              <Users className="size-3.5 text-muted-foreground" aria-hidden="true" />
              {editingGuests ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={guestInput}
                    onChange={(e) => setGuestInput(e.target.value)}
                    className="h-7 w-16 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveGuestCount();
                      if (e.key === "Escape") setEditingGuests(false);
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={handleSaveGuestCount}
                    disabled={isPending}
                  >
                    Lưu
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setEditingGuests(false);
                      setGuestInput(String(order.guest_count ?? ""));
                    }}
                  >
                    Hủy
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors disabled:pointer-events-none"
                  onClick={() => {
                    setGuestInput(String(order.guest_count ?? 1));
                    setEditingGuests(true);
                  }}
                  disabled={!orderActive}
                  title={orderActive ? "Chỉnh sửa số khách" : undefined}
                >
                  {order.guest_count ?? "—"} khách
                  {orderActive && <span className="ml-1 text-xs text-blue-500">✎</span>}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {order.status === "completed" && <ReceiptPrinter order={order} />}
          <Badge variant={ORDER_STATUS_VARIANT[order.status] ?? "secondary"}>
            {getOrderStatusLabel(order.status)}
          </Badge>
        </div>
      </div>

      {/* Notes display */}
      {(order.notes || orderActive) && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border p-3">
          <StickyNote className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Ghi chú</p>
            <p className="text-muted-foreground text-sm">{order.notes || "Không có ghi chú"}</p>
          </div>
          {orderActive && (
            <Popover open={notesOpen} onOpenChange={setNotesOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setNotesInput(order.notes ?? "");
                    setNotesOpen(true);
                  }}
                >
                  Sửa
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Chỉnh sửa ghi chú</p>
                  <Textarea
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="Nhập ghi chú cho đơn hàng..."
                    maxLength={500}
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setNotesOpen(false)}>
                      Hủy
                    </Button>
                    <Button size="sm" onClick={handleSaveNotes} disabled={isPending}>
                      {isPending ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
                      Lưu
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mb-4 flex flex-wrap gap-2">
        {order.status === "draft" && (
          <Button onClick={handleConfirm} disabled={isPending} className="flex-1 gap-2">
            <Send className="size-4" aria-hidden="true" />
            Gửi bếp
          </Button>
        )}
        {order.status === "ready" && (
          <Button
            onClick={() => handleStatusUpdate("served")}
            disabled={isPending}
            className="flex-1 gap-2"
          >
            <CheckCircle className="size-4" aria-hidden="true" />
            Đã phục vụ
          </Button>
        )}
        {order.status === "served" && (
          <Link href="/pos/cashier" className="flex-1">
            <Button variant="outline" className="w-full gap-2">
              <Banknote className="size-4" aria-hidden="true" />
              Chuyển sang thu ngân
            </Button>
          </Link>
        )}

        {/* Table transfer — only for dine_in with active order */}
        {order.type === "dine_in" && orderActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={openTableTransfer}
            disabled={isPending}
            className="gap-1.5"
          >
            <ArrowRightLeft className="size-4" aria-hidden="true" />
            Chuyển bàn
          </Button>
        )}

        {(order.status === "draft" || order.status === "confirmed") && (
          <Button
            variant="destructive"
            onClick={() => handleStatusUpdate("cancelled")}
            disabled={isPending}
          >
            Hủy đơn
          </Button>
        )}
      </div>

      {/* Status guidance */}
      {order.status === "served" && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-center text-sm text-blue-700">
          Đơn hàng đã phục vụ — chờ thanh toán tại quầy thu ngân
        </div>
      )}
      {order.status === "preparing" && (
        <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-center text-sm text-orange-700">
          Bếp đang chuẩn bị đơn hàng
        </div>
      )}

      {/* Items */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Danh sách món ({order.order_items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.order_items.map((item) => {
              const editable = isItemEditable(order.status, item.status);

              return (
                <div key={item.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {item.quantity}x {item.menu_items?.name ?? "Món đã xóa"}
                      {item.menu_item_variants && (
                        <span className="text-muted-foreground text-sm">
                          {" "}
                          ({item.menu_item_variants.name})
                        </span>
                      )}
                    </p>
                    {item.notes && <p className="text-muted-foreground text-xs">{item.notes}</p>}

                    {/* Quantity controls — only for editable items */}
                    {editable && (
                      <div className="mt-1 flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() => handleUpdateQty(item.id, item.quantity, -1)}
                          disabled={isPending}
                          aria-label="Giảm số lượng"
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() => handleUpdateQty(item.id, item.quantity, 1)}
                          disabled={isPending}
                          aria-label="Tăng số lượng"
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-2">
                    <p className="text-sm font-medium">{formatPrice(item.item_total)}</p>

                    {/* Remove button — only for editable items */}
                    {editable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isPending}
                        aria-label="Xóa món"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Tạm tính</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Thuế</span>
              <span>{formatPrice(order.tax)}</span>
            </div>
            <div className="flex justify-between">
              <span>Phí dịch vụ</span>
              <span>{formatPrice(order.service_charge)}</span>
            </div>
            {order.discount_total > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Giảm giá</span>
                <span>-{formatPrice(order.discount_total)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-lg font-bold">
              <span>Tổng cộng</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status History */}
      {order.order_status_history.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Lịch sử trạng thái</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {order.order_status_history
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((h) => (
                  <div
                    key={h.id}
                    className="text-muted-foreground flex items-center justify-between text-sm"
                  >
                    <span>
                      {h.from_status ? `${getOrderStatusLabel(h.from_status)} → ` : ""}
                      {getOrderStatusLabel(h.to_status)}
                    </span>
                    <span className="text-xs">{formatDateTime(h.created_at)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================= */}
      {/* Table Transfer Dialog                                              */}
      {/* ================================================================= */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chuyển bàn</DialogTitle>
          </DialogHeader>

          {loadingTables ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : availableTables.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">Không có bàn trống</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {availableTables.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTableId(t.id)}
                  className={`rounded-lg border p-3 text-center transition-colors ${
                    selectedTableId === t.id
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                      : "hover:border-gray-400"
                  }`}
                >
                  <p className="text-lg font-bold">{t.number}</p>
                  <p className="text-muted-foreground text-xs">
                    {t.branch_zones?.name ?? ""} · {t.capacity} chỗ
                  </p>
                </button>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowTableDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleTransferTable} disabled={!selectedTableId || isPending}>
              {isPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="mr-1 size-4" />
              )}
              Chuyển bàn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

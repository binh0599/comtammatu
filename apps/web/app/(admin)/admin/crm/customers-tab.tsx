"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
  History,
  Coins,
  Search,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  formatPrice,
  getCustomerGenderLabel,
  getCustomerSourceLabel,
} from "@comtammatu/shared";
import {
  createCustomer,
  updateCustomer,
  toggleCustomerActive,
} from "./actions";
import type { Customer, LoyaltyTier } from "./crm-types";
import { CustomerForm } from "./customer-form";
import { LoyaltyHistoryDialog } from "./loyalty-history-dialog";
import { AdjustPointsDialog } from "./adjust-points-dialog";

export function CustomersTab({
  customers,
  loyaltyTiers,
}: {
  customers: Customer[];
  loyaltyTiers: LoyaltyTier[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [pointsCustomer, setPointsCustomer] = useState<Customer | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCustomer(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        setIsCreateOpen(false);
        setError(null);
      }
    });
  }

  function handleUpdate(id: number, formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateCustomer(id, formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        setEditingItem(null);
        setError(null);
      }
    });
  }

  function handleToggleActive(id: number) {
    startTransition(async () => {
      const result = await toggleCustomerActive(id);
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Khách hàng</h2>
          <p className="text-muted-foreground">
            Quản lý danh sách khách hàng của nhà hàng
          </p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (open) setError(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Thêm khách hàng
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Thêm khách hàng</DialogTitle>
              <DialogDescription>
                Tạo khách hàng mới cho nhà hàng
              </DialogDescription>
            </DialogHeader>
            <CustomerForm
              loyaltyTiers={loyaltyTiers}
              onSubmit={handleCreate}
              isPending={isPending}
              error={error}
              submitLabel="Tạo"
              pendingLabel="Đang tạo..."
            />
          </DialogContent>
        </Dialog>
      </div>

      {error && !isCreateOpen && !editingItem && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Danh sách khách hàng</CardTitle>
              <CardDescription>
                {filteredCustomers.length} / {customers.length} khách hàng
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Tìm theo tên, SĐT, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Tên</TableHead>
              <TableHead scope="col">SĐT</TableHead>
              <TableHead scope="col">Email</TableHead>
              <TableHead scope="col">Giới tính</TableHead>
              <TableHead scope="col">Nguồn</TableHead>
              <TableHead scope="col">Hạng</TableHead>
              <TableHead scope="col" className="text-right">Tổng chi</TableHead>
              <TableHead scope="col">Trạng thái</TableHead>
              <TableHead scope="col" className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <UserPlus className="text-muted-foreground/50 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">
                      {searchQuery
                        ? "Không tìm thấy khách hàng phù hợp"
                        : "Chưa có khách hàng nào"}
                    </p>
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchQuery("")}
                      >
                        Xóa bộ lọc
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    {customer.full_name}
                  </TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>{customer.email ?? "-"}</TableCell>
                  <TableCell>
                    {customer.gender
                      ? getCustomerGenderLabel(customer.gender)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {customer.source
                      ? getCustomerSourceLabel(customer.source)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {customer.loyalty_tiers ? (
                      <Badge variant="outline">
                        {customer.loyalty_tiers.name}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(customer.total_spent)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={customer.is_active ? "default" : "secondary"}
                    >
                      {customer.is_active ? "Hoạt động" : "Ngưng"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Loyalty History */}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Lịch sử điểm"
                        onClick={() => setHistoryCustomer(customer)}
                      >
                        <History className="h-4 w-4" aria-hidden="true" />
                      </Button>

                      {/* Adjust Points */}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Điều chỉnh điểm"
                        onClick={() => setPointsCustomer(customer)}
                      >
                        <Coins className="h-4 w-4" aria-hidden="true" />
                      </Button>

                      {/* Edit Dialog */}
                      <Dialog
                        open={editingItem?.id === customer.id}
                        onOpenChange={(open) => {
                          if (!open) {
                            setEditingItem(null);
                            setError(null);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setError(null);
                              setEditingItem(customer);
                            }}
                            aria-label="Sửa"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Sửa khách hàng</DialogTitle>
                            <DialogDescription>
                              Cập nhật thông tin &quot;{customer.full_name}
                              &quot;
                            </DialogDescription>
                          </DialogHeader>
                          <CustomerForm
                            defaultValues={customer}
                            loyaltyTiers={loyaltyTiers}
                            onSubmit={(formData) =>
                              handleUpdate(customer.id, formData)
                            }
                            isPending={isPending}
                            error={error}
                            submitLabel="Lưu"
                            pendingLabel="Đang lưu..."
                            showTierField
                          />
                        </DialogContent>
                      </Dialog>

                      {/* Toggle Active */}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={
                          customer.is_active ? "Vô hiệu hóa" : "Kích hoạt"
                        }
                        onClick={() => handleToggleActive(customer.id)}
                      >
                        {customer.is_active ? (
                          <ToggleRight className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </CardContent>
      </Card>

      {/* Loyalty History Dialog */}
      {historyCustomer && (
        <LoyaltyHistoryDialog
          customer={historyCustomer}
          open={!!historyCustomer}
          onOpenChange={(open) => {
            if (!open) setHistoryCustomer(null);
          }}
        />
      )}

      {/* Adjust Points Dialog */}
      {pointsCustomer && (
        <AdjustPointsDialog
          customer={pointsCustomer}
          open={!!pointsCustomer}
          onOpenChange={(open) => {
            if (!open) setPointsCustomer(null);
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
  History,
  Coins,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatPrice,
  formatDateTime,
  formatPoints,
  getCustomerGenderLabel,
  getCustomerSourceLabel,
  getLoyaltyTransactionTypeLabel,
  CUSTOMER_GENDERS,
  CUSTOMER_SOURCES,
  LOYALTY_TRANSACTION_TYPES,
} from "@comtammatu/shared";
import {
  createCustomer,
  updateCustomer,
  toggleCustomerActive,
  getCustomerLoyaltyHistory,
  adjustLoyaltyPoints,
} from "./actions";

interface LoyaltyTier {
  id: number;
  name: string;
  min_points: number;
  discount_pct: number | null;
}

interface Customer {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  gender: string | null;
  birthday: string | null;
  source: string | null;
  loyalty_tier_id: number | null;
  total_spent: number;
  total_visits: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  loyalty_tiers: { name: string } | null;
}

interface LoyaltyTransaction {
  id: number;
  customer_id: number;
  points: number;
  type: string;
  balance_after: number | null;
  reference_type: string | null;
  created_at: string;
}

// --- Customer Form ---

function CustomerForm({
  defaultValues,
  loyaltyTiers,
  onSubmit,
  isPending,
  error,
  submitLabel,
  pendingLabel,
  showTierField,
}: {
  defaultValues?: Customer;
  loyaltyTiers: LoyaltyTier[];
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  error: string | null;
  submitLabel: string;
  pendingLabel: string;
  showTierField?: boolean;
}) {
  const [gender, setGender] = useState(defaultValues?.gender ?? "");
  const [source, setSource] = useState(defaultValues?.source ?? "");
  const [tierId, setTierId] = useState(
    defaultValues?.loyalty_tier_id?.toString() ?? ""
  );

  return (
    <form action={onSubmit}>
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="full_name">Ho ten *</Label>
          <Input
            id="full_name"
            name="full_name"
            defaultValue={defaultValues?.full_name}
            placeholder="VD: Nguyen Van A"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="phone">So dien thoai *</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={defaultValues?.phone}
              placeholder="VD: 0901234567"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaultValues?.email ?? ""}
              placeholder="VD: email@example.com"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="gender">Gioi tinh</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue placeholder="Chon gioi tinh" />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {getCustomerGenderLabel(g)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="gender" value={gender} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="birthday">Ngay sinh</Label>
            <Input
              id="birthday"
              name="birthday"
              type="date"
              defaultValue={defaultValues?.birthday ?? ""}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="source">Nguon</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue placeholder="Chon nguon" />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {getCustomerSourceLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="source" value={source} />
          </div>
          {showTierField && (
            <div className="grid gap-2">
              <Label htmlFor="loyalty_tier_id">Hang thanh vien</Label>
              <Select value={tierId} onValueChange={setTierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chon hang" />
                </SelectTrigger>
                <SelectContent>
                  {loyaltyTiers.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id.toString()}>
                      {tier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="loyalty_tier_id" value={tierId} />
            </div>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="notes">Ghi chu</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={defaultValues?.notes ?? ""}
            placeholder="Ghi chu ve khach hang"
            rows={2}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

// --- Loyalty History Dialog ---

function LoyaltyHistoryDialog({
  customer,
  open,
  onOpenChange,
}: {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [history, setHistory] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadHistory() {
    setLoading(true);
    const result = await getCustomerLoyaltyHistory(customer.id);
    if (result && "data" in result && result.data) {
      setHistory(result.data);
    }
    setLoading(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) loadHistory();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Lich su diem — {customer.full_name}</DialogTitle>
          <DialogDescription>
            20 giao dich gan nhat
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="text-muted-foreground">Dang tai...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            Chua co giao dich nao
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngay</TableHead>
                  <TableHead>Loai</TableHead>
                  <TableHead className="text-right">Diem</TableHead>
                  <TableHead className="text-right">So du</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">
                      {formatDateTime(tx.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getLoyaltyTransactionTypeLabel(tx.type)}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        tx.points > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatPoints(tx.points)}
                    </TableCell>
                    <TableCell className="text-right">
                      {tx.balance_after != null ? tx.balance_after : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Adjust Points Dialog ---

function AdjustPointsDialog({
  customer,
  open,
  onOpenChange,
}: {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("earn");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const pointsRaw = Number(formData.get("points"));
    const referenceType = (formData.get("reference_type") as string) || undefined;

    // For redeem type, points should be negative
    const points = type === "redeem" ? -Math.abs(pointsRaw) : Math.abs(pointsRaw);

    startTransition(async () => {
      const result = await adjustLoyaltyPoints({
        customer_id: customer.id,
        points,
        type,
        reference_type: referenceType,
      });
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        onOpenChange(false);
        setError(null);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) {
          setError(null);
          setType("earn");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dieu chinh diem — {customer.full_name}</DialogTitle>
          <DialogDescription>
            Them hoac tru diem thuong cho khach hang
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Loai giao dich</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOYALTY_TRANSACTION_TYPES.filter(
                    (t) => t !== "expire"
                  ).map((t) => (
                    <SelectItem key={t} value={t}>
                      {getLoyaltyTransactionTypeLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="points">So diem</Label>
              <Input
                id="points"
                name="points"
                type="number"
                min="1"
                placeholder="VD: 100"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reference_type">Ly do (tuy chon)</Label>
              <Input
                id="reference_type"
                name="reference_type"
                placeholder="VD: Mua hang, Khuyen mai"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Dang xu ly..." : "Xac nhan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Component ---

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
          <h2 className="text-2xl font-bold tracking-tight">Khach hang</h2>
          <p className="text-muted-foreground">
            Quan ly danh sach khach hang cua nha hang
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
              <Plus className="mr-2 h-4 w-4" />
              Them khach hang
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Them khach hang</DialogTitle>
              <DialogDescription>
                Tao khach hang moi cho nha hang
              </DialogDescription>
            </DialogHeader>
            <CustomerForm
              loyaltyTiers={loyaltyTiers}
              onSubmit={handleCreate}
              isPending={isPending}
              error={error}
              submitLabel="Tao"
              pendingLabel="Dang tao..."
            />
          </DialogContent>
        </Dialog>
      </div>

      {error && !isCreateOpen && !editingItem && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ten</TableHead>
              <TableHead>SDT</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Gioi tinh</TableHead>
              <TableHead>Nguon</TableHead>
              <TableHead>Hang</TableHead>
              <TableHead className="text-right">Tong chi</TableHead>
              <TableHead>Trang thai</TableHead>
              <TableHead className="text-right">Thao tac</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-muted-foreground h-24 text-center"
                >
                  Chua co khach hang nao
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
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
                      {customer.is_active ? "Hoat dong" : "Ngung"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Loyalty History */}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Lich su diem"
                        onClick={() => setHistoryCustomer(customer)}
                      >
                        <History className="h-4 w-4" />
                      </Button>

                      {/* Adjust Points */}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Dieu chinh diem"
                        onClick={() => setPointsCustomer(customer)}
                      >
                        <Coins className="h-4 w-4" />
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
                            title="Sua"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Sua khach hang</DialogTitle>
                            <DialogDescription>
                              Cap nhat thong tin &quot;{customer.full_name}
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
                            submitLabel="Luu"
                            pendingLabel="Dang luu..."
                            showTierField
                          />
                        </DialogContent>
                      </Dialog>

                      {/* Toggle Active */}
                      <Button
                        variant="ghost"
                        size="icon"
                        title={
                          customer.is_active ? "Vo hieu hoa" : "Kich hoat"
                        }
                        onClick={() => handleToggleActive(customer.id)}
                      >
                        {customer.is_active ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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

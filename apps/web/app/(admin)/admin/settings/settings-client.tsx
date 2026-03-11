"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Building2, Store, Settings2, Save, CreditCard, Banknote, QrCode, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaymentMethodsConfig, BankTransferConfig } from "@comtammatu/shared";
import {
  updateBranch,
  updateSystemSetting,
  updatePaymentMethodsConfig,
  type SettingsData,
} from "./actions";

const PLAN_LABELS: Record<string, string> = {
  free: "Miễn phí",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

function SettingInput({
  label,
  settingKey,
  currentValue,
}: {
  label: string;
  settingKey: string;
  currentValue: string;
}) {
  const [value, setValue] = useState(currentValue);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateSystemSetting({ key: settingKey, value });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Đã cập nhật ${label}`);
      }
    });
  }

  return (
    <div className="flex items-end gap-3">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor={settingKey}>{label}</Label>
        <Input
          id={settingKey}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      <Button
        onClick={handleSave}
        disabled={isPending || value === currentValue}
        size="sm"
        className="gap-1"
      >
        <Save className="h-3.5 w-3.5" />
        {isPending ? "..." : "Lưu"}
      </Button>
    </div>
  );
}

function BranchCard({
  branch,
}: {
  branch: SettingsData["branches"][number];
}) {
  const [name, setName] = useState(branch.name);
  const [address, setAddress] = useState(branch.address);
  const [phone, setPhone] = useState(branch.phone);
  const [isPending, startTransition] = useTransition();

  const hasChanges =
    name !== branch.name ||
    address !== branch.address ||
    phone !== branch.phone;

  function handleSave() {
    startTransition(async () => {
      const result = await updateBranch({
        branch_id: branch.id,
        name,
        address,
        phone,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã cập nhật chi nhánh");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4" />
            {branch.code}
          </CardTitle>
          <Badge variant={branch.is_active ? "default" : "secondary"}>
            {branch.is_active ? "Hoạt động" : "Ngừng"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`branch-name-${branch.id}`}>Tên chi nhánh</Label>
          <Input
            id={`branch-name-${branch.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`branch-addr-${branch.id}`}>Địa chỉ</Label>
          <Input
            id={`branch-addr-${branch.id}`}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`branch-phone-${branch.id}`}>Số điện thoại</Label>
          <Input
            id={`branch-phone-${branch.id}`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          Múi giờ: {branch.timezone}
        </div>
        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={isPending}
            size="sm"
            className="gap-1"
          >
            <Save className="h-3.5 w-3.5" />
            {isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Common Vietnamese banks for VietQR
const BANKS = [
  { id: "MB", name: "MB Bank" },
  { id: "VCB", name: "Vietcombank" },
  { id: "TCB", name: "Techcombank" },
  { id: "ACB", name: "ACB" },
  { id: "TPB", name: "TPBank" },
  { id: "VPB", name: "VPBank" },
  { id: "BIDV", name: "BIDV" },
  { id: "ICB", name: "VietinBank" },
  { id: "STB", name: "Sacombank" },
  { id: "MSB", name: "MSB" },
  { id: "HDB", name: "HDBank" },
  { id: "OCB", name: "OCB" },
  { id: "SHB", name: "SHB" },
  { id: "EIB", name: "Eximbank" },
  { id: "VIB", name: "VIB" },
  { id: "LPB", name: "LienVietPostBank" },
  { id: "BAB", name: "Bắc Á Bank" },
  { id: "SCB", name: "SCB" },
] as const;

const DEFAULT_CONFIG: PaymentMethodsConfig = {
  enabled_methods: ["cash"],
};

function sanitizeAccountName(name: string): string {
  // eslint-disable-next-line no-control-regex -- intentionally stripping control characters
  const controlChars = /[\x00-\x1f]/g;
  return name
    .trim()
    .replace(controlChars, "")
    .replace(/\s{2,}/g, " ");
}

function PaymentMethodsCard({
  config,
}: {
  config: PaymentMethodsConfig | null;
}) {
  const current = config ?? DEFAULT_CONFIG;
  const [enabledMethods, setEnabledMethods] = useState<string[]>(
    current.enabled_methods,
  );
  const [bankId, setBankId] = useState(current.bank_transfer?.bank_id ?? "");
  const [accountNo, setAccountNo] = useState(
    current.bank_transfer?.account_no ?? "",
  );
  const [accountName, setAccountName] = useState(
    current.bank_transfer?.account_name ?? "",
  );
  const [template, setTemplate] = useState(
    current.bank_transfer?.template ?? "compact2",
  );
  const [isPending, startTransition] = useTransition();

  const transferEnabled = enabledMethods.includes("transfer");

  function toggleMethod(method: string) {
    setEnabledMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method],
    );
  }

  function handleSave() {
    startTransition(async () => {
      const trimmedAccountNo = accountNo.trim();
      const trimmedAccountName = sanitizeAccountName(accountName);

      const payload: PaymentMethodsConfig = {
        enabled_methods: enabledMethods as PaymentMethodsConfig["enabled_methods"],
        ...(transferEnabled && bankId && trimmedAccountNo && trimmedAccountName
          ? {
              bank_transfer: {
                bank_id: bankId,
                account_no: trimmedAccountNo,
                account_name: trimmedAccountName,
                template: template as BankTransferConfig["template"],
              },
            }
          : {}),
      };

      const result = await updatePaymentMethodsConfig(payload);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã cập nhật phương thức thanh toán");
      }
    });
  }

  // Build QR preview URL
  const sanitizedName = sanitizeAccountName(accountName);
  const sanitizedAccountNo = accountNo.trim();
  const previewUrl =
    transferEnabled && bankId && sanitizedAccountNo && sanitizedName
      ? `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(sanitizedAccountNo)}-${template}.png?amount=50000&addInfo=DH1234&accountName=${encodeURIComponent(sanitizedName)}`
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Phương thức thanh toán
        </CardTitle>
        <CardDescription>
          Bật/tắt phương thức thanh toán và cấu hình tài khoản ngân hàng
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment method toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              <Label htmlFor="method-cash">Tiền mặt</Label>
            </div>
            <Switch
              id="method-cash"
              checked={enabledMethods.includes("cash")}
              onCheckedChange={() => toggleMethod("cash")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              <Label htmlFor="method-qr">QR (Momo)</Label>
            </div>
            <Switch
              id="method-qr"
              checked={enabledMethods.includes("qr")}
              onCheckedChange={() => toggleMethod("qr")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              <Label htmlFor="method-transfer">Chuyển khoản ngân hàng (VietQR)</Label>
            </div>
            <Switch
              id="method-transfer"
              checked={transferEnabled}
              onCheckedChange={() => toggleMethod("transfer")}
            />
          </div>
        </div>

        {/* Bank transfer config — shown when transfer is enabled */}
        {transferEnabled && (
          <div className="rounded-lg border p-4 space-y-4">
            <h4 className="text-sm font-medium">Cấu hình tài khoản ngân hàng</h4>

            <div className="space-y-1.5">
              <Label htmlFor="bank-id">Ngân hàng</Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger id="bank-id">
                  <SelectValue placeholder="Chọn ngân hàng" />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="account-no">Số tài khoản</Label>
              <Input
                id="account-no"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                placeholder="VD: 0123456789"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="account-name">Tên chủ tài khoản</Label>
              <Input
                id="account-name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="VD: CONG TY COM TAM MA TU"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qr-template">Mẫu QR</Label>
              <Select value={template} onValueChange={(v) => setTemplate(v as BankTransferConfig["template"])}>
                <SelectTrigger id="qr-template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="compact2">Compact 2</SelectItem>
                  <SelectItem value="qr_only">Chỉ QR</SelectItem>
                  <SelectItem value="print">In ấn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* QR Preview */}
            {previewUrl && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Xem trước (50,000đ - DH1234)</Label>
                <div className="rounded-lg border bg-white p-2 w-fit">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="VietQR Preview"
                    className="h-48 w-auto"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={isPending}
          size="sm"
          className="gap-1"
        >
          <Save className="h-3.5 w-3.5" />
          {isPending ? "Đang lưu..." : "Lưu cấu hình thanh toán"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function SettingsClient({ data }: { data: SettingsData }) {
  const taxRate =
    data.settings.find((s) => s.key === "tax_rate")?.value ?? "10";
  const serviceCharge =
    data.settings.find((s) => s.key === "service_charge")?.value ?? "5";

  return (
    <div className="space-y-6">
      {/* Tenant info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Thông tin doanh nghiệp
          </CardTitle>
          <CardDescription>
            Thông tin chung của hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground text-xs">Tên</Label>
              <p className="font-medium">{data.tenant.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Slug</Label>
              <p className="font-medium">{data.tenant.slug}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Gói</Label>
              <Badge variant="outline">
                {PLAN_LABELS[data.tenant.subscription_plan] ??
                  data.tenant.subscription_plan}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Cài đặt hệ thống
          </CardTitle>
          <CardDescription>
            Thuế và phụ thu áp dụng cho tất cả đơn hàng
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingInput
            label="Thuế VAT (%)"
            settingKey="tax_rate"
            currentValue={taxRate}
          />
          <SettingInput
            label="Phụ thu dịch vụ (%)"
            settingKey="service_charge"
            currentValue={serviceCharge}
          />
        </CardContent>
      </Card>

      {/* Payment methods */}
      <PaymentMethodsCard config={data.paymentMethodsConfig} />

      {/* Branches */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Chi nhánh</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.branches.map((branch) => (
            <BranchCard key={branch.id} branch={branch} />
          ))}
        </div>
      </div>
    </div>
  );
}

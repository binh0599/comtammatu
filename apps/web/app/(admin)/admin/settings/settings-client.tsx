"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Building2, Store, Settings2, Save } from "lucide-react";
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
import {
  updateBranch,
  updateSystemSetting,
  type SettingsData,
} from "./actions";

const PLAN_LABELS: Record<string, string> = {
  free: "Mien phi",
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
        toast.success(`Da cap nhat ${label}`);
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
        {isPending ? "..." : "Luu"}
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
        toast.success("Da cap nhat chi nhanh");
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
            {branch.is_active ? "Hoat dong" : "Ngung"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`branch-name-${branch.id}`}>Ten chi nhanh</Label>
          <Input
            id={`branch-name-${branch.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`branch-addr-${branch.id}`}>Dia chi</Label>
          <Input
            id={`branch-addr-${branch.id}`}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`branch-phone-${branch.id}`}>So dien thoai</Label>
          <Input
            id={`branch-phone-${branch.id}`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          Mui gio: {branch.timezone}
        </div>
        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={isPending}
            size="sm"
            className="gap-1"
          >
            <Save className="h-3.5 w-3.5" />
            {isPending ? "Dang luu..." : "Luu thay doi"}
          </Button>
        )}
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
            Thong tin doanh nghiep
          </CardTitle>
          <CardDescription>
            Thong tin chung cua he thong
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground text-xs">Ten</Label>
              <p className="font-medium">{data.tenant.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Slug</Label>
              <p className="font-medium">{data.tenant.slug}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Goi</Label>
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
            Cai dat he thong
          </CardTitle>
          <CardDescription>
            Thue va phu thu ap dung cho tat ca don hang
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingInput
            label="Thue VAT (%)"
            settingKey="tax_rate"
            currentValue={taxRate}
          />
          <SettingInput
            label="Phu thu dich vu (%)"
            settingKey="service_charge"
            currentValue={serviceCharge}
          />
        </CardContent>
      </Card>

      {/* Branches */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Chi nhanh</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.branches.map((branch) => (
            <BranchCard key={branch.id} branch={branch} />
          ))}
        </div>
      </div>
    </div>
  );
}

"use server";

import "@/lib/server-bootstrap";
import {
  getAdminContext,
  getBranchIdsForTenant,
  withServerQuery,
  withServerAction,
  safeDbError,
  ADMIN_ROLES,
  paymentMethodsConfigSchema,
  type PaymentMethodsConfig,
} from "@comtammatu/shared";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const updateBranchSchema = z.object({
  branch_id: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  address: z.string().min(1).max(300).optional(),
  phone: z.string().min(1).max(20).optional(),
  timezone: z.string().min(1).max(50).optional(),
});

const updateSettingSchema = z.object({
  key: z.string().min(1).max(50),
  value: z.string().max(100),
});

// ---------------------------------------------------------------------------
// getSettings
// ---------------------------------------------------------------------------

export interface SettingsData {
  tenant: {
    id: number;
    name: string;
    slug: string;
    logo_url: string | null;
    subscription_plan: string;
  };
  branches: {
    id: number;
    name: string;
    code: string;
    address: string;
    phone: string;
    timezone: string;
    operating_hours: unknown;
    is_active: boolean;
  }[];
  settings: { key: string; value: string | null }[];
  paymentMethodsConfig: PaymentMethodsConfig | null;
}

async function _getSettings(): Promise<SettingsData> {
  const { supabase, tenantId } = await getAdminContext(ADMIN_ROLES);

  const [tenantRes, branchRes, settingsRes] = await Promise.all([
    supabase
      .from("tenants")
      .select("id, name, slug, logo_url, subscription_plan")
      .eq("id", tenantId)
      .single(),
    supabase
      .from("branches")
      .select("id, name, code, address, phone, timezone, operating_hours, is_active")
      .eq("tenant_id", tenantId)
      .order("name"),
    supabase.from("system_settings").select("key, value").eq("tenant_id", tenantId),
  ]);

  if (tenantRes.error) throw safeDbError(tenantRes.error, "db");
  if (branchRes.error) throw safeDbError(branchRes.error, "db");
  if (settingsRes.error) throw safeDbError(settingsRes.error, "db");

  const allSettings = settingsRes.data ?? [];
  const paymentConfigRaw = allSettings.find(
    (s: { key: string }) => s.key === "payment_methods_config"
  );
  let paymentMethodsConfig: PaymentMethodsConfig | null = null;
  if (paymentConfigRaw?.value) {
    const parsed = paymentMethodsConfigSchema.safeParse(paymentConfigRaw.value);
    if (parsed.success) paymentMethodsConfig = parsed.data;
  }

  return {
    tenant: tenantRes.data,
    branches: branchRes.data ?? [],
    settings: allSettings.map((s: { key: string; value: unknown }) => ({
      key: s.key,
      value: s.value != null ? String(s.value) : null,
    })),
    paymentMethodsConfig,
  };
}

export const getSettings = withServerQuery(_getSettings);

// ---------------------------------------------------------------------------
// updateBranch
// ---------------------------------------------------------------------------

async function _updateBranch(input: z.infer<typeof updateBranchSchema>) {
  const data = updateBranchSchema.parse(input);
  const { supabase, tenantId, userId } = await getAdminContext(["owner", "manager"]);

  // Verify branch belongs to tenant
  const { data: branch, error: checkErr } = await supabase
    .from("branches")
    .select("id")
    .eq("id", data.branch_id)
    .eq("tenant_id", tenantId)
    .single();

  if (checkErr || !branch) {
    return { error: "Chi nhánh không tồn tại" };
  }

  const updateFields: Record<string, unknown> = {};
  if (data.name !== undefined) updateFields.name = data.name;
  if (data.address !== undefined) updateFields.address = data.address;
  if (data.phone !== undefined) updateFields.phone = data.phone;
  if (data.timezone !== undefined) updateFields.timezone = data.timezone;

  if (Object.keys(updateFields).length === 0) {
    return { error: null };
  }

  const { error } = await supabase
    .from("branches")
    .update(updateFields)
    .eq("id", data.branch_id)
    .eq("tenant_id", tenantId);

  if (error) throw safeDbError(error, "db");

  return { error: null };
}

export const updateBranch = withServerAction(_updateBranch);

// ---------------------------------------------------------------------------
// updateSystemSetting
// ---------------------------------------------------------------------------

async function _updateSystemSetting(input: z.infer<typeof updateSettingSchema>) {
  const data = updateSettingSchema.parse(input);
  const { supabase, tenantId, userId } = await getAdminContext(["owner"]);

  const { error } = await supabase.from("system_settings").upsert(
    {
      tenant_id: tenantId,
      key: data.key,
      value: data.value,
      updated_by: userId,
    },
    { onConflict: "tenant_id,key" }
  );

  if (error) throw safeDbError(error, "db");

  return { error: null };
}

export const updateSystemSetting = withServerAction(_updateSystemSetting);

// ---------------------------------------------------------------------------
// updatePaymentMethodsConfig
// ---------------------------------------------------------------------------

async function _updatePaymentMethodsConfig(input: PaymentMethodsConfig) {
  const data = paymentMethodsConfigSchema.parse(input);
  const { supabase, tenantId, userId } = await getAdminContext(["owner"]);

  // Validate: if transfer is enabled, bank_transfer config must be present
  if (data.enabled_methods.includes("transfer") && !data.bank_transfer) {
    return { error: "Cần cấu hình tài khoản ngân hàng khi bật chuyển khoản" };
  }

  // Must have at least one method enabled
  if (data.enabled_methods.length === 0) {
    return { error: "Phải bật ít nhất một phương thức thanh toán" };
  }

  const { error } = await supabase.from("system_settings").upsert(
    {
      tenant_id: tenantId,
      key: "payment_methods_config",
      value: data,
      updated_by: userId,
    },
    { onConflict: "tenant_id,key" }
  );

  if (error) throw safeDbError(error, "db");

  return { error: null };
}

export const updatePaymentMethodsConfig = withServerAction(_updatePaymentMethodsConfig);

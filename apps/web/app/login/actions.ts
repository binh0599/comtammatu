"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import {
  ActionError,
  handleServerActionError,
  entityIdSchema,
  DEVICE_CHECK_ROLES,
  type DeviceTerminalType,
} from "@comtammatu/shared";
import { authLimiter } from "@comtammatu/security";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  device_fingerprint: z.string().min(1).max(255).optional(),
  device_name: z.string().max(255).optional(),
});

function generateApprovalCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0/O/1/I to avoid confusion
  let code = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i]! % chars.length];
  }
  return code;
}

function getRoleRedirectPath(role: string): string {
  if (role === "owner" || role === "manager") return "/admin";
  if (role === "cashier" || role === "waiter") return "/pos";
  if (role === "chef") return "/kds";
  if (role === "hr") return "/admin/hr";
  return "/customer";
}

const ROLE_TO_TERMINAL: Record<string, DeviceTerminalType> = {
  waiter: "mobile_order",
  cashier: "cashier_station",
  chef: "kds_station",
};

function getTerminalTypeForRole(role: string): DeviceTerminalType | null {
  return ROLE_TO_TERMINAL[role] ?? null;
}

async function _login(formData: FormData) {
  // Rate limit by IP
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = await authLimiter.limit(ip);
  if (!success) {
    throw new ActionError(
      "Quá nhiều lần đăng nhập. Vui lòng thử lại sau.",
      "VALIDATION_ERROR",
    );
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    device_fingerprint: formData.get("device_fingerprint") || undefined,
    device_name: formData.get("device_name") || undefined,
  });

  if (!parsed.success) {
    throw new ActionError(
      parsed.error.issues[0]?.message ?? "Thông tin đăng nhập không hợp lệ",
      "VALIDATION_ERROR",
    );
  }

  const supabase = await createSupabaseServer();

  const { error, data: authData } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !authData.user) {
    // Generic error message — never reveal whether user exists
    throw new ActionError(
      "Email hoặc mật khẩu không chính xác",
      "UNAUTHORIZED",
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id, branch_id")
    .eq("id", authData.user.id)
    .single();

  const role = profile?.role ?? "customer";

  // Owner, manager, hr, customer: skip device check, redirect directly
  if (
    !DEVICE_CHECK_ROLES.includes(
      role as (typeof DEVICE_CHECK_ROLES)[number],
    )
  ) {
    redirect(getRoleRedirectPath(role));
  }

  // Staff roles: require device fingerprint and complete profile
  const fingerprint = parsed.data.device_fingerprint;
  if (!fingerprint || !profile?.tenant_id || !profile?.branch_id) {
    // Missing fingerprint or incomplete profile — show error instead of bypassing
    throw new ActionError(
      "Thiết bị chưa được nhận diện. Vui lòng thử lại.",
      "VALIDATION_ERROR",
    );
  }

  // Check if device is already registered — scope by tenant (unique per tenant)
  const { data: existingDevice } = await supabase
    .from("registered_devices")
    .select("id, status, approval_code, branch_id, registered_by")
    .eq("device_fingerprint", fingerprint)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();

  if (existingDevice) {
    // Device approved for THIS user at same branch — go straight through
    if (
      existingDevice.status === "approved" &&
      existingDevice.registered_by === authData.user.id &&
      existingDevice.branch_id === profile.branch_id
    ) {
      redirect(getRoleRedirectPath(role));
    }

    // Device pending for THIS user at same branch — show pending page
    if (
      existingDevice.status === "pending" &&
      existingDevice.registered_by === authData.user.id &&
      existingDevice.branch_id === profile.branch_id
    ) {
      return {
        pendingApproval: true,
        approvalCode: existingDevice.approval_code,
        deviceId: existingDevice.id,
        role,
      };
    }

    // All other cases: device belongs to another user, different branch,
    // or was rejected — re-register for the current user with new approval code
    const reregTerminalType = getTerminalTypeForRole(role);
    const { error: reregError } = await supabase
      .from("registered_devices")
      .update({
        status: "pending",
        approval_code: generateApprovalCode(),
        registered_by: authData.user.id,
        branch_id: profile.branch_id,
        device_name: parsed.data.device_name ?? "",
        ip_address: ip,
        user_agent: headersList.get("user-agent")?.slice(0, 500) ?? "",
        approved_by: null,
        approved_at: null,
        rejected_at: null,
        linked_terminal_id: null,
        linked_station_id: null,
        terminal_type: reregTerminalType,
      })
      .eq("id", existingDevice.id);

    if (reregError) {
      throw new ActionError(
        "Không thể đăng ký lại thiết bị. Vui lòng liên hệ quản lý.",
        "VALIDATION_ERROR",
      );
    }

    const { data: refreshed } = await supabase
      .from("registered_devices")
      .select("id, approval_code")
      .eq("id", existingDevice.id)
      .single();

    return {
      pendingApproval: true,
      approvalCode: refreshed?.approval_code ?? "",
      deviceId: refreshed?.id ?? existingDevice.id,
      role,
    };
  }

  // New device — register it
  const approvalCode = generateApprovalCode();
  const terminalType = getTerminalTypeForRole(role);
  const { data: newDevice, error: insertError } = await supabase
    .from("registered_devices")
    .insert({
      tenant_id: profile.tenant_id,
      branch_id: profile.branch_id,
      device_fingerprint: fingerprint,
      device_name: parsed.data.device_name ?? "",
      approval_code: approvalCode,
      ip_address: ip,
      user_agent: headersList.get("user-agent")?.slice(0, 500) ?? "",
      registered_by: authData.user.id,
      status: "pending",
      terminal_type: terminalType,
    })
    .select("id")
    .single();

  if (insertError) {
    // Duplicate fingerprint within tenant (23505) — device exists in another branch
    if (insertError.code === "23505") {
      throw new ActionError(
        "Thiết bị đã được đăng ký ở chi nhánh khác. Vui lòng liên hệ quản lý.",
        "VALIDATION_ERROR",
      );
    }
    throw new ActionError(
      "Không thể đăng ký thiết bị. Vui lòng thử lại.",
      "VALIDATION_ERROR",
    );
  }

  return {
    pendingApproval: true,
    approvalCode: approvalCode,
    deviceId: newDevice?.id ?? 0,
    role,
  };
}

export async function login(formData: FormData) {
  try {
    return await _login(formData);
  } catch (error) {
    // Re-throw Next.js redirect errors
    if (error instanceof Error && "digest" in error) {
      throw error;
    }
    return handleServerActionError(error);
  }
}

/**
 * Check if a device has been approved (called from pending page polling).
 * Scoped to the requesting user's tenant to prevent cross-tenant queries.
 */
export async function checkDeviceStatus(deviceId: number) {
  const parsed = entityIdSchema.safeParse(deviceId);
  if (!parsed.success) {
    return { status: "error" as const, error: "ID không hợp lệ" };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error" as const, error: "Chưa đăng nhập" };
  }

  // Get user's tenant for scoping
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return { status: "error" as const, error: "Không tìm thấy hồ sơ" };
  }

  // Only allow querying devices within the user's tenant
  const { data: device } = await supabase
    .from("registered_devices")
    .select("status, registered_by")
    .eq("id", parsed.data)
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (!device) {
    return { status: "error" as const, error: "Thiết bị không tồn tại" };
  }

  // Only the device registrant or an admin can check status
  if (device.registered_by !== user.id) {
    return { status: "error" as const, error: "Không có quyền" };
  }

  return { status: device.status as "pending" | "approved" | "rejected" };
}

export async function logout() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

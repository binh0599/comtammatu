import type { Metadata } from "next";
import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { DEVICE_CHECK_ROLES, ROLE_REDIRECT_MAP } from "@comtammatu/shared";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Đăng nhập - Cơm tấm Má Tư",
};

export default async function LoginPage() {
  // Check if already authenticated
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pass pending device info to client if staff is authenticated but device not approved
  let pendingDeviceInfo: {
    approvalCode: string;
    deviceId: number;
    role: string;
  } | null = null;

  if (user) {
    // Already logged in — redirect based on role
    const { data } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    const role = data?.role;

    // Staff roles: check device approval before redirecting.
    // Fail-closed: if tenant_id is missing, show login form (incomplete profile).
    if (role && DEVICE_CHECK_ROLES.includes(role as (typeof DEVICE_CHECK_ROLES)[number])) {
      if (data?.tenant_id) {
        const { data: device } = await supabase
          .from("registered_devices")
          .select("id, status, approval_code, branch_id")
          .eq("registered_by", user.id)
          .eq("tenant_id", data.tenant_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (device?.status === "approved") {
          // Device approved — redirect to role dashboard
          if (role === "cashier" || role === "waiter") redirect("/pos");
          else if (role === "chef") redirect("/kds");
        }

        if (device?.status === "pending") {
          // Device pending — pass info to client to show pending screen
          pendingDeviceInfo = {
            approvalCode: device.approval_code,
            deviceId: device.id,
            role,
          };
        }

        // If rejected or no device: show login form (client handles re-registration)
        // Don't redirect — let staff re-register
      }
      // If tenant_id missing: fall through to show login form
    } else if (role) {
      // Non-device roles: redirect directly if route exists
      const target = ROLE_REDIRECT_MAP[role];
      if (target) redirect(target);
      // Unknown roles: fall through to show login form
    }
  }

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center px-4">
      <LoginForm pendingDevice={pendingDeviceInfo} />
    </div>
  );
}

"use server";

import "@/lib/server-bootstrap";
import {
  getActionContext,
  withServerAction,
  withServerQuery,
  updateMyProfileSchema,
  changePasswordSchema,
  type UpdateMyProfileInput,
  type ChangePasswordInput,
  safeDbError,
  safeDbErrorResult,
} from "@comtammatu/shared";
import { createSupabaseServer } from "@comtammatu/database";
import { revalidatePath } from "next/cache";
import { findMyEmployee } from "./_helpers";

// =====================
// Employee record for current user
// =====================

async function _getMyEmployee() {
  const { supabase, userId, tenantId } = await getActionContext();

  const { data, error } = await supabase
    .from("employees")
    .select("*, branches!inner(name)")
    .eq("profile_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw safeDbError(error, "db");
  return data;
}

export const getMyEmployee = withServerQuery(_getMyEmployee);

// =====================
// Profile: get my profile + employee info
// =====================

async function _getMyProfile() {
  const { supabase, userId, tenantId } = await getActionContext();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role, branch_id")
    .eq("id", userId)
    .single();

  if (profileError) throw safeDbError(profileError, "db");

  const { data: employee, error: empError } = await supabase
    .from("employees")
    .select("*, branches!inner(name)")
    .eq("profile_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (empError) throw safeDbError(empError, "db");

  return { profile, employee };
}

export const getMyProfile = withServerQuery(_getMyProfile);

// =====================
// Profile: update personal info
// =====================

async function _updateMyProfile(data: UpdateMyProfileInput) {
  const parsed = updateMyProfileSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { supabase, userId, tenantId } = await getActionContext();

  // Update profile name
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name })
    .eq("id", userId);

  if (profileError) return safeDbErrorResult(profileError, "db");

  // Update emergency contact on employee record
  if (parsed.data.emergency_contact !== undefined) {
    const { error: empError } = await supabase
      .from("employees")
      .update({ emergency_contact: parsed.data.emergency_contact })
      .eq("profile_id", userId)
      .eq("tenant_id", tenantId);

    if (empError) return safeDbErrorResult(empError, "db");
  }

  revalidatePath("/employee/profile");
  return { error: null, success: true };
}

export const updateMyProfile = withServerAction(_updateMyProfile);

// =====================
// Profile: change password
// =====================

async function _changeMyPassword(data: ChangePasswordInput) {
  const parsed = changePasswordSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const supabase = await createSupabaseServer();

  // Verify current password by re-authenticating
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: "Không thể xác thực người dùng" };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });

  if (signInError) {
    return { error: "Mật khẩu hiện tại không đúng" };
  }

  // Now update password
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null, success: true };
}

export const changeMyPassword = withServerAction(_changeMyPassword);

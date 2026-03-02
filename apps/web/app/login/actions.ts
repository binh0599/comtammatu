"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { ActionError, handleServerActionError } from "@comtammatu/shared";
import { authLimiter } from "@comtammatu/security";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

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
    .select("role")
    .eq("id", authData.user.id)
    .single();

  const role = profile?.role ?? "customer";

  // Role-based redirect
  if (role === "owner" || role === "manager") redirect("/admin");
  else if (role === "cashier" || role === "waiter") redirect("/pos");
  else if (role === "chef") redirect("/kds");
  else redirect("/customer");
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

export async function logout() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ActionError, handleServerActionError } from "@comtammatu/shared";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

async function _login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    throw new ActionError(
      parsed.error.errors[0]?.message ?? "Thông tin đăng nhập không hợp lệ",
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
  switch (role) {
    case "owner":
    case "manager":
      redirect("/admin");
    case "cashier":
    case "waiter":
      redirect("/pos");
    case "chef":
      redirect("/kds");
    default:
      redirect("/customer");
  }
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

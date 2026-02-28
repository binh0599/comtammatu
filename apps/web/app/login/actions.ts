"use server";

import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Thông tin đăng nhập không hợp lệ" };
  }

  const supabase = await createSupabaseServer();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Generic error message (IX.6 — never reveal whether user exists)
    return { error: "Email hoặc mật khẩu không chính xác" };
  }

  // Fetch user role for redirect
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Đã xảy ra lỗi, vui lòng thử lại" };
  }

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = data?.role ?? "customer";

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

export async function logout() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

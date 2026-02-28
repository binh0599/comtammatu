import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Check if already authenticated
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Already logged in — redirect based on role
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = data?.role ?? "customer";

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <LoginForm />
    </div>
  );
}

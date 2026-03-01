import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { getCashierOrders } from "./actions";
import { CashierClient } from "./cashier-client";

export default async function CashierPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  if (!["cashier", "manager", "owner"].includes(profile.role)) {
    redirect("/pos");
  }

  // Check for active session
  const { data: session } = await supabase
    .from("pos_sessions")
    .select("id, opening_amount, opened_at, terminal_id, pos_terminals(name)")
    .eq("cashier_id", user.id)
    .eq("status", "open")
    .maybeSingle();

  if (!session) {
    redirect("/pos/session");
  }

  const orders = await getCashierOrders();

  return (
    <CashierClient
      session={{
        id: session.id,
        opening_amount: session.opening_amount,
        opened_at: session.opened_at,
        cashier_name: profile.full_name,
        terminal_name:
          (session.pos_terminals as { name: string } | null)?.name ??
          `Máy #${session.terminal_id}`,
      }}
      orders={orders}
    />
  );
}

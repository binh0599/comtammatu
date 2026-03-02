import { createSupabaseServer } from "@comtammatu/database";
import { CustomerHome } from "./customer-home";

export default async function CustomerPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let customerName: string | null = null;
  let loyaltyTierName: string | null = null;
  let loyaltyPoints = 0;

  if (user) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id, full_name, loyalty_tier_id, loyalty_tiers(name)")
      .eq("email", user.email ?? "")
      .single();

    if (customer) {
      customerName = customer.full_name;
      loyaltyTierName =
        (customer.loyalty_tiers as { name: string } | null)?.name ?? null;

      // Calculate points from transactions
      const { data: txns } = await supabase
        .from("loyalty_transactions")
        .select("points")
        .eq("customer_id", customer.id);

      if (txns) {
        loyaltyPoints = txns.reduce((sum, row) => sum + (row.points ?? 0), 0);
      }
    }
  }

  return (
    <CustomerHome
      isLoggedIn={!!user}
      customerName={customerName}
      loyaltyTierName={loyaltyTierName}
      loyaltyPoints={loyaltyPoints}
    />
  );
}

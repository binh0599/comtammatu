import type { Metadata } from "next";
import { createSupabaseServer } from "@comtammatu/database";
import { redirect } from "next/navigation";
import { getCustomerLoyalty } from "../actions";
import { LoyaltyDashboard } from "./loyalty-dashboard";

export const metadata: Metadata = {
  title: "Tích điểm - Cơm tấm Má Tư",
};

export default async function LoyaltyPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let loyalty: Awaited<ReturnType<typeof getCustomerLoyalty>> | null = null;
  try {
    loyalty = await getCustomerLoyalty();
  } catch {
    // Customer record may not exist — show empty state
  }

  if (!loyalty) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <p className="text-muted-foreground text-sm">
          Chưa có thông tin tích điểm. Vui lòng liên hệ nhà hàng.
        </p>
      </div>
    );
  }

  return <LoyaltyDashboard loyalty={loyalty} />;
}

import type { Metadata } from "next";
import { createSupabaseServer } from "@comtammatu/database";
import { getCustomerLoyalty } from "../actions";
import { LoyaltyDashboard } from "./loyalty-dashboard";

export const metadata: Metadata = {
  title: "Tích điểm - Com Tấm Mã Tú",
};

export default async function LoyaltyPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <p className="text-muted-foreground text-sm">
          Chua co thong tin tich diem. Vui long lien he nha hang.
        </p>
      </div>
    );
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
          Chua co thong tin tich diem. Vui long lien he nha hang.
        </p>
      </div>
    );
  }

  return <LoyaltyDashboard loyalty={loyalty} />;
}

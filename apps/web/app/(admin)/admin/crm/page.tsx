import { Header } from "@/components/admin/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Crown, Ticket, MessageCircle } from "lucide-react";
import {
  getCustomers,
  getLoyaltyTiers,
  getVouchers,
  getFeedback,
  getBranches,
  getCrmStats,
} from "./actions";
import { CrmStatsCards } from "./crm-stats-cards";
import { CustomersTab } from "./customers-tab";
import { LoyaltyTiersTab } from "./loyalty-tiers-tab";
import { VouchersTab } from "./vouchers-tab";
import { FeedbackTab } from "./feedback-tab";

export default async function CrmPage() {
  const [customers, loyaltyTiers, vouchers, feedback, branches, stats] =
    await Promise.all([
      getCustomers(),
      getLoyaltyTiers(),
      getVouchers(),
      getFeedback(),
      getBranches(),
      getCrmStats(),
    ]);

  return (
    <>
      <Header breadcrumbs={[{ label: "Khách hàng" }]} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <CrmStatsCards stats={stats} />

        <Tabs defaultValue="customers" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="customers" className="gap-2">
              <Users className="hidden size-4 sm:inline-block" />
              Khách hàng
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="gap-2">
              <Crown className="hidden size-4 sm:inline-block" />
              Hạng thành viên
            </TabsTrigger>
            <TabsTrigger value="vouchers" className="gap-2">
              <Ticket className="hidden size-4 sm:inline-block" />
              Voucher
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2">
              <MessageCircle className="hidden size-4 sm:inline-block" />
              Phản hồi
            </TabsTrigger>
          </TabsList>
          <TabsContent value="customers" className="mt-6">
            <CustomersTab
              customers={customers}
              loyaltyTiers={loyaltyTiers}
            />
          </TabsContent>
          <TabsContent value="loyalty" className="mt-6">
            <LoyaltyTiersTab loyaltyTiers={loyaltyTiers} />
          </TabsContent>
          <TabsContent value="vouchers" className="mt-6">
            <VouchersTab vouchers={vouchers} branches={branches} />
          </TabsContent>
          <TabsContent value="feedback" className="mt-6">
            <FeedbackTab feedback={feedback} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

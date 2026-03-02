import { Header } from "@/components/admin/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCustomers,
  getLoyaltyTiers,
  getVouchers,
  getFeedback,
  getBranches,
} from "./actions";
import { CustomersTab } from "./customers-tab";
import { LoyaltyTiersTab } from "./loyalty-tiers-tab";
import { VouchersTab } from "./vouchers-tab";
import { FeedbackTab } from "./feedback-tab";

export default async function CrmPage() {
  const [customers, loyaltyTiers, vouchers, feedback, branches] =
    await Promise.all([
      getCustomers(),
      getLoyaltyTiers(),
      getVouchers(),
      getFeedback(),
      getBranches(),
    ]);

  return (
    <>
      <Header breadcrumbs={[{ label: "Khach hang" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Tabs defaultValue="customers" className="w-full">
          <TabsList>
            <TabsTrigger value="customers">Khach hang</TabsTrigger>
            <TabsTrigger value="loyalty">Hang thanh vien</TabsTrigger>
            <TabsTrigger value="vouchers">Voucher</TabsTrigger>
            <TabsTrigger value="feedback">Phan hoi</TabsTrigger>
          </TabsList>
          <TabsContent value="customers">
            <CustomersTab
              customers={customers}
              loyaltyTiers={loyaltyTiers}
            />
          </TabsContent>
          <TabsContent value="loyalty">
            <LoyaltyTiersTab loyaltyTiers={loyaltyTiers} />
          </TabsContent>
          <TabsContent value="vouchers">
            <VouchersTab vouchers={vouchers} branches={branches} />
          </TabsContent>
          <TabsContent value="feedback">
            <FeedbackTab feedback={feedback} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

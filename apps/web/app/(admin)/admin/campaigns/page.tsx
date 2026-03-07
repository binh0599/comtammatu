import { Header } from "@/components/admin/header";
import { getCampaigns } from "./actions";
import { CampaignsClient } from "./campaigns-client";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <>
      <Header breadcrumbs={[{ label: "Chien dich" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <CampaignsClient campaigns={campaigns ?? []} />
      </div>
    </>
  );
}

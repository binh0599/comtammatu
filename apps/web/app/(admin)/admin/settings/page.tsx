import { Header } from "@/components/admin/header";
import { getSettings } from "./actions";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const data = await getSettings();

  return (
    <>
      <Header breadcrumbs={[{ label: "Cài đặt" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <SettingsClient data={data} />
      </div>
    </>
  );
}

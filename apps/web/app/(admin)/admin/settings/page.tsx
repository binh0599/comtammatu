import { Header } from "@/components/admin/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Printer } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPrinterConfigs } from "./printer-actions";
import { PrinterConfigTab } from "./printer-config-tab";

export default async function SettingsPage() {
  const printers = await getPrinterConfigs();

  return (
    <>
      <Header breadcrumbs={[{ label: "Cài đặt" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs defaultValue="printers" className="w-full">
          <TabsList>
            <TabsTrigger value="general" className="gap-2">
              <Settings className="size-4" />
              Chung
            </TabsTrigger>
            <TabsTrigger value="printers" className="gap-2">
              <Printer className="size-4" />
              Máy in
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="size-5" />
                  Cài đặt chung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Tính năng cài đặt chung đang được phát triển. Vui lòng quay lại sau.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="printers">
            <PrinterConfigTab initialPrinters={printers ?? []} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

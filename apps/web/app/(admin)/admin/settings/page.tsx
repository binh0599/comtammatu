import { Header } from "@/components/admin/header";
import { Settings } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SettingsPage() {
  return (
    <>
      <Header breadcrumbs={[{ label: "Cài đặt" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
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
      </div>
    </>
  );
}

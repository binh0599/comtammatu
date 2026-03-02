import { Header } from "@/components/admin/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <>
      <Header breadcrumbs={[{ label: "Cài đặt" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-5" />
              Cài đặt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Tính năng cài đặt đang được phát triển. Vui lòng quay lại sau.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

import { Header } from "@/components/admin/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <>
      <Header breadcrumbs={[{ label: "Báo cáo" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5" />
              Báo cáo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Tính năng báo cáo đang được phát triển. Vui lòng quay lại sau.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

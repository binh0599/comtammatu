import type { Metadata } from "next";
import { Star, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Đánh giá - Com Tấm Mã Tú",
};

export default function FeedbackPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <div className="bg-yellow-50 flex h-16 w-16 items-center justify-center rounded-full">
        <Star className="h-8 w-8 text-yellow-500" />
      </div>
      <h1 className="text-xl font-bold">Danh gia</h1>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Smartphone className="text-muted-foreground h-5 w-5 flex-shrink-0" />
          <p className="text-muted-foreground text-sm">
            Tinh nang danh gia se co tren ung dung di dong. Vui long cho cap
            nhat!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

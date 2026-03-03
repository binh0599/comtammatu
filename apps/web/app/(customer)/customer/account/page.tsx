import type { Metadata } from "next";
import { User, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Tài khoản - Com Tấm Mã Tú",
};

export default function AccountPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <div className="bg-green-50 flex h-16 w-16 items-center justify-center rounded-full">
        <User className="h-8 w-8 text-green-500" />
      </div>
      <h1 className="text-xl font-bold">Tai khoan</h1>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Smartphone className="text-muted-foreground h-5 w-5 flex-shrink-0" />
          <p className="text-muted-foreground text-sm">
            Dang nhap va quan ly tai khoan tren ung dung di dong. Vui long cho
            cap nhat!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

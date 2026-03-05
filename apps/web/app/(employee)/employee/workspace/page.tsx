import { EMPLOYEE_PORTAL_ROLES, POS_ROLES, KDS_ROLES } from "@comtammatu/shared";
import { requireLayoutAuth } from "@/lib/layout-auth";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Monitor, ChefHat, ShieldAlert } from "lucide-react";

export default async function WorkspacePage() {
  const { profile } = await requireLayoutAuth<Record<string, unknown>>(
    EMPLOYEE_PORTAL_ROLES,
    "role"
  );

  const role = profile.role;
  const canPOS = (POS_ROLES as readonly string[]).includes(role);
  const canKDS = (KDS_ROLES as readonly string[]).includes(role);

  if (!canPOS && !canKDS) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-center gap-3 pt-6">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            Vai trò của bạn không có quyền truy cập POS hoặc KDS.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Không gian làm việc</h2>

      {canPOS && (
        <Link href="/pos">
          <Card className="transition-colors hover:bg-accent cursor-pointer">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
                <Monitor className="text-primary h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Mở POS</p>
                <p className="text-muted-foreground text-sm">
                  Giao diện bán hàng & thu ngân
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {canKDS && (
        <Link href="/kds">
          <Card className="transition-colors hover:bg-accent cursor-pointer">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="bg-orange-100 flex h-12 w-12 items-center justify-center rounded-lg">
                <ChefHat className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold">Mở KDS</p>
                <p className="text-muted-foreground text-sm">
                  Màn hình bếp (Kitchen Display)
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import {
  LogOut,
  Download,
  Trash2,
  User,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDateTime, formatPrice } from "@comtammatu/shared";
import { logout } from "@/app/login/actions";
import { requestDataExport, requestDeletion } from "../actions";
import { toast } from "sonner";
import { PushNotificationToggle } from "@/components/push-notification-toggle";

interface ProfileData {
  fullName: string;
  phone: string;
  email: string | null;
  gender: string | null;
  birthday: string | null;
  totalSpent: number;
  totalVisits: number;
  createdAt: string;
}

interface AccountClientProps {
  profile: ProfileData | null;
  userEmail: string | null;
}

export function AccountClient({ profile, userEmail }: AccountClientProps) {
  const [isExporting, startExportTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deletionScheduled, setDeletionScheduled] = useState(false);

  function handleExport() {
    startExportTransition(async () => {
      try {
        const data = await requestDataExport();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Dữ liệu đã được tải xuống");
      } catch {
        toast.error("Không thể xuất dữ liệu. Vui lòng thử lại.");
      }
    });
  }

  function handleDeletion() {
    startDeleteTransition(async () => {
      const result = await requestDeletion();
      if (result.error) {
        toast.error(result.error);
      } else {
        setDeletionScheduled(true);
        toast.success("Yêu cầu xóa tài khoản đã được ghi nhận");
      }
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Tài khoản</h1>

      {/* Profile info */}
      {profile ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Thông tin cá nhân</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="flex items-center gap-3">
              <User className="text-muted-foreground h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{profile.fullName}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="text-muted-foreground h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{profile.phone}</span>
            </div>
            {(profile.email ?? userEmail) && (
              <div className="flex items-center gap-3">
                <Mail className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                <span className="text-sm">
                  {profile.email ?? userEmail}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="text-muted-foreground h-4 w-4 flex-shrink-0" />
              <span className="text-muted-foreground text-sm">
                Thành viên từ {formatDateTime(profile.createdAt)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tổng chi tiêu</span>
              <span className="font-medium">
                {formatPrice(profile.totalSpent)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Số lần ghé thăm</span>
              <span className="font-medium">{profile.totalVisits}</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-sm">
              Chưa có thông tin khách hàng. Vui lòng liên hệ nhà hàng.
            </p>
            {userEmail && (
              <p className="text-muted-foreground mt-2 text-sm">
                Email: {userEmail}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Push notifications */}
      <PushNotificationToggle />

      {/* Actions */}
      <div className="space-y-3">
        {/* Logout */}
        <form action={logout}>
          <Button
            type="submit"
            variant="outline"
            className="w-full gap-2"
            size="lg"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Button>
        </form>

        {/* Data export — only if profile exists */}
        {profile && (
          <>
            <Separator />
            <p className="text-muted-foreground text-xs">
              Quyền riêng tư & dữ liệu
            </p>

            <Button
              variant="outline"
              className="w-full gap-2"
              size="lg"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Đang xuất dữ liệu..." : "Xuất dữ liệu của tôi"}
            </Button>

            {/* Deletion request */}
            {deletionScheduled ? (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="flex items-start gap-3 p-4">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">
                      Yêu cầu xóa đã được ghi nhận
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Tài khoản của bạn sẽ bị xóa sau 30 ngày. Liên hệ nhà hàng
                      để hủy yêu cầu.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Trash2 className="h-4 w-4" />
                    Yêu cầu xóa tài khoản
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xóa tài khoản</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tài khoản của bạn sẽ được xóa sau 30 ngày. Trong thời gian
                      này, bạn có thể liên hệ nhà hàng để hủy yêu cầu. Sau khi
                      xóa, toàn bộ dữ liệu (đơn hàng, điểm thưởng, đánh giá) sẽ
                      bị xóa vĩnh viễn và không thể khôi phục.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeletion}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? "Đang xử lý..." : "Xác nhận xóa"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}
      </div>
    </div>
  );
}

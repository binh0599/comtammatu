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
        toast.success("Du lieu da duoc tai xuong");
      } catch {
        toast.error("Khong the xuat du lieu. Vui long thu lai.");
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
        toast.success("Yeu cau xoa tai khoan da duoc ghi nhan");
      }
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Tai khoan</h1>

      {/* Profile info */}
      {profile ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Thong tin ca nhan</CardTitle>
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
                Thanh vien tu {formatDateTime(profile.createdAt)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tong chi tieu</span>
              <span className="font-medium">
                {formatPrice(profile.totalSpent)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">So lan ghe tham</span>
              <span className="font-medium">{profile.totalVisits}</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-sm">
              Chua co thong tin khach hang. Vui long lien he nha hang.
            </p>
            {userEmail && (
              <p className="text-muted-foreground mt-2 text-sm">
                Email: {userEmail}
              </p>
            )}
          </CardContent>
        </Card>
      )}

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
            Dang xuat
          </Button>
        </form>

        {/* Data export — only if profile exists */}
        {profile && (
          <>
            <Separator />
            <p className="text-muted-foreground text-xs">
              Quyen rieng tu & du lieu
            </p>

            <Button
              variant="outline"
              className="w-full gap-2"
              size="lg"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Dang xuat du lieu..." : "Xuat du lieu cua toi"}
            </Button>

            {/* Deletion request */}
            {deletionScheduled ? (
              <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30">
                <CardContent className="flex items-start gap-3 p-4">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">
                      Yeu cau xoa da duoc ghi nhan
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Tai khoan cua ban se bi xoa sau 30 ngay. Lien he nha hang
                      de huy yeu cau.
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
                    Yeu cau xoa tai khoan
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xoa tai khoan</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tai khoan cua ban se duoc xoa sau 30 ngay. Trong thoi gian
                      nay, ban co the lien he nha hang de huy yeu cau. Sau khi
                      xoa, toan bo du lieu (don hang, diem thuong, danh gia) se
                      bi xoa vinh vien va khong the khoi phuc.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Huy</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeletion}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? "Dang xu ly..." : "Xac nhan xoa"}
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

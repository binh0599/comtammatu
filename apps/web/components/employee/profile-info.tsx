"use client";

import { useState, useTransition } from "react";
import { UserCircle, Shield, Building2, Briefcase, Calendar } from "lucide-react";
import { updateMyProfile, changeMyPassword } from "@/app/(employee)/employee/actions";
import { getEmploymentTypeLabel, getEmployeeStatusLabel, formatDate } from "@comtammatu/shared";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/role-labels";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
} from "@comtammatu/ui";

interface EmergencyContact {
  name?: string | null;
  phone?: string | null;
  relationship?: string | null;
}

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

interface EmployeeProfile {
  id: number;
  position: string;
  department: string | null;
  employment_type: string;
  status: string;
  hire_date: string;
  emergency_contact: Json | null;
  branches: { name: string } | null;
}

interface ProfileInfoProps {
  profile: { full_name: string | null; role: string; branch_id: number | null } | null;
  employee: EmployeeProfile | null;
  userEmail: string | null;
}

function getEmergencyContact(ec: Json | null): EmergencyContact | null {
  if (!ec || typeof ec !== "object" || Array.isArray(ec)) return null;
  return ec as EmergencyContact;
}

export function ProfileInfo({ profile, employee, userEmail }: ProfileInfoProps) {
  const ec = getEmergencyContact(employee?.emergency_contact ?? null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Profile form state
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [ecName, setEcName] = useState(ec?.name ?? "");
  const [ecPhone, setEcPhone] = useState(ec?.phone ?? "");
  const [ecRelationship, setEcRelationship] = useState(ec?.relationship ?? "");

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateMyProfile({
        full_name: fullName,
        emergency_contact: {
          name: ecName || undefined,
          phone: ecPhone || undefined,
          relationship: ecRelationship || undefined,
        },
      });

      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã cập nhật thông tin");
        setIsEditingProfile(false);
      }
    });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await changeMyPassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã đổi mật khẩu thành công");
        setIsEditingPassword(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Personal info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle className="h-4 w-4" />
            Thông tin cá nhân
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditingProfile ? (
            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="full_name">Họ tên</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  minLength={2}
                />
              </div>

              <Separator />
              <p className="text-sm font-medium">Liên hệ khẩn cấp</p>

              <div>
                <Label htmlFor="ec_name">Tên người liên hệ</Label>
                <Input id="ec_name" value={ecName} onChange={(e) => setEcName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ec_phone">Số điện thoại</Label>
                <Input id="ec_phone" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ec_relationship">Quan hệ</Label>
                <Input
                  id="ec_relationship"
                  value={ecRelationship}
                  onChange={(e) => setEcRelationship(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isPending} size="sm">
                  {isPending ? "Đang lưu..." : "Lưu"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFullName(profile?.full_name ?? "");
                    setEcName(ec?.name ?? "");
                    setEcPhone(ec?.phone ?? "");
                    setEcRelationship(ec?.relationship ?? "");
                    setIsEditingProfile(false);
                  }}
                >
                  Hủy
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <InfoRow label="Họ tên" value={profile?.full_name ?? "—"} />
              <InfoRow label="Email" value={userEmail ?? "—"} />
              <InfoRow
                label="Vai trò"
                value={ROLE_LABELS[profile?.role ?? ""] ?? profile?.role ?? "—"}
              />

              {employee && (
                <>
                  <Separator />
                  <InfoRow
                    label="Chi nhánh"
                    value={employee.branches?.name ?? "—"}
                    icon={<Building2 className="h-3.5 w-3.5" />}
                  />
                  <InfoRow
                    label="Vị trí"
                    value={employee.position ?? "—"}
                    icon={<Briefcase className="h-3.5 w-3.5" />}
                  />
                  {employee.department && <InfoRow label="Phòng ban" value={employee.department} />}
                  <InfoRow
                    label="Ngày vào làm"
                    value={employee.hire_date ? formatDate(employee.hire_date) : "—"}
                    icon={<Calendar className="h-3.5 w-3.5" />}
                  />
                  <InfoRow
                    label="Loại HĐ"
                    value={getEmploymentTypeLabel(employee.employment_type)}
                  />
                  <InfoRow label="Trạng thái" value={getEmployeeStatusLabel(employee.status)} />

                  {ec && (
                    <>
                      <Separator />
                      <p className="text-xs font-medium text-muted-foreground">Liên hệ khẩn cấp</p>
                      {ec.name && <InfoRow label="Tên" value={ec.name} />}
                      {ec.phone && <InfoRow label="SĐT" value={ec.phone} />}
                      {ec.relationship && <InfoRow label="Quan hệ" value={ec.relationship} />}
                    </>
                  )}
                </>
              )}

              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-fit"
                onClick={() => setIsEditingProfile(true)}
              >
                Chỉnh sửa thông tin
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Bảo mật
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditingPassword ? (
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="current_password">Mật khẩu hiện tại</Label>
                <Input
                  id="current_password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div>
                <Label htmlFor="new_password">Mật khẩu mới</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Tối thiểu 8 ký tự"
                />
              </div>
              <div>
                <Label htmlFor="confirm_password">Xác nhận mật khẩu</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending} size="sm">
                  {isPending ? "Đang đổi..." : "Đổi mật khẩu"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditingPassword(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                >
                  Hủy
                </Button>
              </div>
            </form>
          ) : (
            <div>
              <p className="text-muted-foreground text-sm mb-3">Đổi mật khẩu đăng nhập của bạn.</p>
              <Button variant="outline" size="sm" onClick={() => setIsEditingPassword(true)}>
                Đổi mật khẩu
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

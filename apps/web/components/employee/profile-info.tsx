"use client";

import { useState } from "react";
import { UserCircle, Shield, Building2, Briefcase, Calendar } from "lucide-react";
import { getEmploymentTypeLabel, getEmployeeStatusLabel, formatDate } from "@comtammatu/shared";
import { ROLE_LABELS } from "@/lib/role-labels";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from "@comtammatu/ui";
import { ProfileEditForm } from "./profile-edit-form";
import { PasswordChangeForm } from "./password-change-form";

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
            <ProfileEditForm
              initialName={profile?.full_name ?? ""}
              initialEc={ec}
              onCancel={() => setIsEditingProfile(false)}
              onSuccess={() => setIsEditingProfile(false)}
            />
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
            <PasswordChangeForm
              onCancel={() => setIsEditingPassword(false)}
              onSuccess={() => setIsEditingPassword(false)}
            />
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

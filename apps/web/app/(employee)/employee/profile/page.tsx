import { EMPLOYEE_PORTAL_ROLES } from "@comtammatu/shared";
import { requireLayoutAuth } from "@/lib/layout-auth";
import { getMyProfile } from "../actions";
import { ProfileInfo } from "@/components/employee/profile-info";

export default async function ProfilePage() {
  const { user } = await requireLayoutAuth<Record<string, unknown>>(
    EMPLOYEE_PORTAL_ROLES,
    "role"
  );

  const { profile, employee } = await getMyProfile();

  return (
    <ProfileInfo
      profile={profile}
      employee={employee}
      userEmail={user.email ?? null}
    />
  );
}

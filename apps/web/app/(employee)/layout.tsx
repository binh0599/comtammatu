import { EMPLOYEE_PORTAL_ROLES } from "@comtammatu/shared";
import { requireLayoutAuth } from "@/lib/layout-auth";
import { EmployeeNav } from "@/components/employee/employee-nav";
import { EmployeeHeader } from "@/components/employee/employee-header";
import { Toaster } from "@/components/ui/sonner";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireLayoutAuth<{
    full_name: string | null;
    branch_id: number | null;
  }>(EMPLOYEE_PORTAL_ROLES, "role, full_name, branch_id");

  return (
    <div data-route-group="employee" className="bg-background min-h-screen pb-16">
      <EmployeeHeader
        employeeName={profile.full_name ?? "Nhân viên"}
        role={profile.role}
      />
      <main id="main-content" className="mx-auto max-w-lg px-4 py-4 animate-page-in">
        {children}
      </main>
      <EmployeeNav />
      <Toaster position="top-center" />
    </div>
  );
}

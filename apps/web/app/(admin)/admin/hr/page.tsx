import { Header } from "@/components/admin/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getEmployees,
  getAvailableProfiles,
  getBranchesForHr,
  getShifts,
  getShiftAssignments,
  getAttendanceRecords,
  getLeaveRequests,
} from "./actions";
import { EmployeesTab } from "./employees-tab";
import { ShiftsTab } from "./shifts-tab";
import { ScheduleTab } from "./schedule-tab";
import { AttendanceTab } from "./attendance-tab";
import { LeaveTab } from "./leave-tab";

export default async function HrPage() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekStart = new Date(now.getTime() - 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  const weekEnd = new Date(now.getTime() + 7 * 86400000)
    .toISOString()
    .slice(0, 10);

  const [
    employees,
    availableProfiles,
    branches,
    shifts,
    assignments,
    attendance,
    leaveRequests,
  ] = await Promise.all([
    getEmployees(),
    getAvailableProfiles(),
    getBranchesForHr(),
    getShifts(),
    getShiftAssignments(weekStart, weekEnd),
    getAttendanceRecords(today),
    getLeaveRequests(),
  ]);

  return (
    <>
      <Header breadcrumbs={[{ label: "Nhan su" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Tabs defaultValue="employees" className="w-full">
          <TabsList>
            <TabsTrigger value="employees">Nhan vien</TabsTrigger>
            <TabsTrigger value="shifts">Ca lam</TabsTrigger>
            <TabsTrigger value="schedule">Lich phan ca</TabsTrigger>
            <TabsTrigger value="attendance">Cham cong</TabsTrigger>
            <TabsTrigger value="leave">Nghi phep</TabsTrigger>
          </TabsList>
          <TabsContent value="employees">
            <EmployeesTab
              employees={employees}
              availableProfiles={availableProfiles}
              branches={branches}
            />
          </TabsContent>
          <TabsContent value="shifts">
            <ShiftsTab shifts={shifts} branches={branches} />
          </TabsContent>
          <TabsContent value="schedule">
            <ScheduleTab
              assignments={assignments}
              employees={employees}
              shifts={shifts}
            />
          </TabsContent>
          <TabsContent value="attendance">
            <AttendanceTab attendance={attendance} />
          </TabsContent>
          <TabsContent value="leave">
            <LeaveTab leaveRequests={leaveRequests} employees={employees} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

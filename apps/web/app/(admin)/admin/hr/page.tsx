import dynamic from "next/dynamic";
import { Header } from "@/components/admin/header";
import {
  getEmployees,
  getCreatableRoles,
  getBranchesForHr,
  getShifts,
  getShiftAssignments,
  getAttendanceRecords,
  getLeaveRequests,
  getPayrollPeriods,
} from "./actions";
import { EmployeesTab } from "./employees-tab";
import { ShiftsTab } from "./shifts-tab";
import { ScheduleTab } from "./schedule-tab";
import { AttendanceTab } from "./attendance-tab";
import { LeaveTab } from "./leave-tab";
import { PayrollTab } from "./payroll-tab";
import {
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@comtammatu/ui";

const PerformanceTab = dynamic(
  () => import("./performance-tab").then((m) => ({ default: m.PerformanceTab })),
  { loading: () => <Skeleton className="h-[400px] w-full" /> },
);

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
    creatableRoles,
    branches,
    shifts,
    assignments,
    attendance,
    leaveRequests,
    payrollPeriods,
  ] = await Promise.all([
    getEmployees(),
    getCreatableRoles(),
    getBranchesForHr(),
    getShifts(),
    getShiftAssignments(weekStart, weekEnd),
    getAttendanceRecords(today),
    getLeaveRequests(),
    getPayrollPeriods(),
  ]);

  return (
    <>
      <Header breadcrumbs={[{ label: "Nhân sự" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs defaultValue="employees" className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="employees">Nhân viên</TabsTrigger>
            <TabsTrigger value="shifts">Ca làm</TabsTrigger>
            <TabsTrigger value="schedule">Lịch phân ca</TabsTrigger>
            <TabsTrigger value="attendance">Chấm công</TabsTrigger>
            <TabsTrigger value="leave">Nghỉ phép</TabsTrigger>
            <TabsTrigger value="payroll">Bảng lương</TabsTrigger>
            <TabsTrigger value="performance">Hiệu suất</TabsTrigger>
          </TabsList>
          <TabsContent value="employees">
            <EmployeesTab
              employees={employees}
              creatableRoles={creatableRoles}
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
          <TabsContent value="payroll">
            <PayrollTab periods={payrollPeriods} branches={branches} />
          </TabsContent>
          <TabsContent value="performance">
            <PerformanceTab branches={branches} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

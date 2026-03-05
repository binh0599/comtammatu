import { getMyTodayShifts, getMyTodayAttendance, getMyEmployee } from "./actions";
import { EmployeeHome } from "@/components/employee/employee-home";

export default async function EmployeeHomePage() {
  const [todayShifts, todayAttendance, employee] = await Promise.all([
    getMyTodayShifts(),
    getMyTodayAttendance(),
    getMyEmployee(),
  ]);

  return (
    <EmployeeHome
      todayShifts={todayShifts}
      todayAttendance={todayAttendance}
      employee={employee}
    />
  );
}

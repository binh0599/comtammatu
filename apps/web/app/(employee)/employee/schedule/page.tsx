import { getMyShiftAssignments } from "../actions";
import { ScheduleCalendar } from "@/components/employee/schedule-calendar";

export default async function SchedulePage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based

  // Fetch current month +/- buffer
  const startDate = new Date(year, month, 1).toISOString().slice(0, 10);
  const endDate = new Date(year, month + 1, 0).toISOString().slice(0, 10);

  const assignments = await getMyShiftAssignments(startDate, endDate);

  return (
    <ScheduleCalendar
      initialAssignments={assignments}
      initialYear={year}
      initialMonth={month}
    />
  );
}

import { getMyShiftAssignments } from "../actions";
import { ScheduleCalendar } from "@/components/employee/schedule-calendar";

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function SchedulePage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based

  const startDate = toLocalDateString(new Date(year, month, 1));
  const endDate = toLocalDateString(new Date(year, month + 1, 0));

  const assignments = await getMyShiftAssignments(startDate, endDate);

  return (
    <ScheduleCalendar initialAssignments={assignments} initialYear={year} initialMonth={month} />
  );
}

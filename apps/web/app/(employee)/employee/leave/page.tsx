import { getMyLeaveRequests, getMyLeaveSummary } from "../actions";
import { LeaveOverview } from "@/components/employee/leave-overview";

export default async function LeavePage() {
  const [leaveRequests, leaveSummary] = await Promise.all([
    getMyLeaveRequests(),
    getMyLeaveSummary(),
  ]);

  return (
    <LeaveOverview
      leaveRequests={leaveRequests}
      leaveSummary={leaveSummary}
    />
  );
}

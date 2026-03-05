import { getMyPayrollEntries } from "../actions";
import { PayrollStubs } from "@/components/employee/payroll-stubs";

export default async function PayrollPage() {
  const entries = await getMyPayrollEntries();

  return <PayrollStubs entries={entries} />;
}

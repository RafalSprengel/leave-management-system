import { notFound } from "next/navigation";

import { getEmployeeById } from "@/actions/manager/employees/getEmployeeById";
import { getEmployeeAnnualUsedDays } from "@/actions/manager/leave/getEmployeeAnnualUsedDays";
import { getLeaveAllowances } from "@/actions/admin/leaveAllowances/getLeaveAllowances";
import type { LeaveAllowanceType } from "@/db/models/LeaveAllowance";
import EmployeeAllowancesTable, {
  type AllowanceRow,
} from "./_components/EmployeeAllowancesTable";

// Leave types displayed as rows. Each row has a "Set" button that stores the
// allowance in the LeaveAllowance collection (one document per employee + type).
const LEAVE_TYPE_ROWS: { type: LeaveAllowanceType; label: string }[] = [
  { type: "holiday", label: "Holiday" },
  { type: "unpaid", label: "Unpaid leave" },
  { type: "sick", label: "Sick" },
  { type: "bereavement", label: "Bereavement" },
];

export default async function EmployeeAllowancesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { success, data: employee } = await getEmployeeById(id);
  if (!success || !employee) {
    notFound();
  }

  const { success: usedSuccess, days } = await getEmployeeAnnualUsedDays(id);
  const usedDays = usedSuccess ? days : 0;

  const { success: allowancesSuccess, data: allowances } =
    await getLeaveAllowances(id);
  const allowanceByType = new Map(
    (allowancesSuccess ? allowances : []).map((a) => [a.type, a.days]),
  );

  const rows: AllowanceRow[] = LEAVE_TYPE_ROWS.map((row) => ({
    ...row,
    // Annual falls back to the legacy employee.holidayAllowance when unset.
    days:
      allowanceByType.get(row.type) ??
      (row.type === "holiday" ? employee.holidayAllowance : 0),
  }));

  return (
    <EmployeeAllowancesTable employeeId={id} rows={rows} usedDays={usedDays} />
  );
}

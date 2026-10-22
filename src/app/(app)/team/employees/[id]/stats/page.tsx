import { Stack } from "@mantine/core";
import { notFound } from "next/navigation";

import { getEmployeeById } from "@/actions/manager/employees/getEmployeeById";
import { getEmployeeLeaveStats } from "@/actions/manager/employees/getEmployeeLeaveStats";
import type { EmployeeLeaveStats } from "@/types/stats";

import { EmployeeStatsCharts } from "./_components/EmployeeStatsCharts";

export default async function EmployeeStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { success, data: employee } = await getEmployeeById(id);
  if (!success || !employee) {
    notFound();
  }

  const { success: statsSuccess, data } = await getEmployeeLeaveStats(id);
  const stats: EmployeeLeaveStats =
    statsSuccess && data
      ? data
      : {
          sickByWeekday: [],
          sickByMonth: [],
          annual: { allowance: 0, used: 0, remaining: 0 },
          sickThisPeriod: 0,
          absenceBreakdown: {
            unauthorised: 0,
            other: 0,
            unpaid: 0,
            bereavement: 0,
          },
        };

  return (
    <Stack gap="md">
      <EmployeeStatsCharts
        {...stats}
        employmentDate={employee.employmentDate}
      />
    </Stack>
  );
}

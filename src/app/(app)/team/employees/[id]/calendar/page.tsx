import { notFound } from "next/navigation";

import { getEmployeeById } from "@/actions/manager/employees/getEmployeeById";
import { getEmployeeLeaveRequests } from "@/actions/manager/leave/getEmployeeLeaveRequests";
import { getClosureDays } from "@/actions/admin/closureDays/getClosureDays";
import { getOrganizationId } from "@/utils/getOrganizationId";
import { getNonWorkingDays } from "@/utils/nonWorkingDays";
import { getWorkingDaySegments } from "@/utils/workingDays";
import HolidaySchedule, { type EmployeeScheduleEvent } from "./HolidaySchedule";

export default async function EmployeeCalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { success, data: employee } = await getEmployeeById(id);
  if (!success || !employee) {
    notFound();
  }

  const { success: leavesSuccess, data } = await getEmployeeLeaveRequests(id);

  // Zatwierdzony urlop wypoczynkowy (annual leave) pracownika
  const approvedLeaves = leavesSuccess
    ? data.filter((req) => req.status === "approved" && req.type === "holiday")
    : [];

  // Dni nierobocze dla zakresu wszystkich urlopow -> jeden Set dla helpera dni pracujacych
  let nonWorkingDates = new Set<string>();
  if (approvedLeaves.length > 0) {
    const starts = approvedLeaves.map((r) => r.startDate);
    const ends = approvedLeaves.map((r) => r.endDate);
    const minStart = starts.reduce((min, d) => (d < min ? d : min), starts[0]);
    const maxEnd = ends.reduce((max, d) => (d > max ? d : max), ends[0]);
    const organizationId = await getOrganizationId();
    nonWorkingDates = await getNonWorkingDays(organizationId, minStart, maxEnd);
  }

  // Zdarzenia = urlop rozbity na ciagle bloki dni roboczych (bez weekendow/swiat)
  const events: EmployeeScheduleEvent[] = approvedLeaves.flatMap((req) =>
    getWorkingDaySegments(req.startDate, req.endDate, nonWorkingDates).map(
      (segment, index) => ({
        id: `${req._id}#${index}`,
        title: "Holiday",
        start: `${segment.start} 00:00:00`,
        end: `${segment.end} 23:59:59`,
      }),
    ),
  );

  // Dni zamkniecia firmy (Closure days)
  const { success: closuresSuccess, data: closureDays } = await getClosureDays(
    "company_closure",
  );
  const closureEvents: EmployeeScheduleEvent[] = closuresSuccess
    ? closureDays
        .filter((c) => c.enabled)
        .map((c) => ({
          id: `closure-${c.date}`,
          title: c.title,
          start: `${c.date} 00:00:00`,
          end: `${c.date} 23:59:59`,
        }))
    : [];

  return <HolidaySchedule events={events} closures={closureEvents} />;
}

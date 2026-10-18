"use server";

import dayjs from "dayjs";

import { getOrgSettings } from "@/actions/admin/settings/getOrgSettings";
import { getEmployeeLeaveRequests } from "@/actions/manager/leave/getEmployeeLeaveRequests";
import connectDB from "@/db/connection";
import Absence from "@/db/models/Absence";
import Employee from "@/db/models/Employee";
import LeaveAllowance from "@/db/models/LeaveAllowance";
import LeaveRequest from "@/db/models/LeaveRequest";
import type {
  AnnualLeaveSummary,
  EmployeeLeaveStats,
  SickMonthStat,
  SickWeekdayStat,
} from "@/types/stats";
import { getOrganizationId } from "@/utils/getOrganizationId";
import { sumAnnualDaysUsed } from "@/utils/leaveBalance";
import { getNonWorkingDays } from "@/utils/nonWorkingDays";
import { getWorkingDays } from "@/utils/workingDays";

const PERIOD_MONTHS = 12;
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export async function getEmployeeLeaveStats(
  employeeId: string,
): Promise<{ success: boolean; data?: EmployeeLeaveStats; error?: string }> {
  try {
    await connectDB();
    const organizationId = await getOrganizationId();

    if (!organizationId) {
      return { success: false, error: "Organization ID is missing" };
    }

    const periodEnd = dayjs();
    const periodStart = periodEnd
      .subtract(PERIOD_MONTHS - 1, "month")
      .startOf("month");
    const periodStartKey = periodStart.format("YYYY-MM-DD");
    const periodEndKey = periodEnd.format("YYYY-MM-DD");

    const settingsResult = await getOrgSettings();
    const holidayYearStart = settingsResult.success
      ? settingsResult.data.holidayYearStart
      : "01-01";
    const [holidayStartMonth, holidayStartDay] = holidayYearStart
      .split("-")
      .map(Number);

    let billingPeriodStart = dayjs()
      .year(periodEnd.year())
      .month(holidayStartMonth - 1)
      .date(holidayStartDay)
      .startOf("day");

    if (periodEnd.isBefore(billingPeriodStart)) {
      billingPeriodStart = billingPeriodStart.subtract(1, "year");
    }

    const billingPeriodStartKey = billingPeriodStart.format("YYYY-MM-DD");
    const queryStartKey =
      billingPeriodStartKey < periodStartKey
        ? billingPeriodStartKey
        : periodStartKey;

    const [
      leaveRequests,
      absences,
      annualAllowance,
      employee,
      employeeRequests,
    ] = await Promise.all([
      LeaveRequest.find({
        organizationId,
        employee: employeeId,
        status: "approved",
        type: "sick",
        startDate: { $lte: periodEndKey },
        endDate: { $gte: queryStartKey },
      }).lean(),
      Absence.find({
        organizationId,
        employee: employeeId,
        type: "sick",
        startDate: { $lte: periodEndKey },
        endDate: { $gte: queryStartKey },
      }).lean(),
      LeaveAllowance.findOne({
        organizationId,
        employee: employeeId,
        type: "annual",
      }).lean(),
      Employee.findOne({ _id: employeeId, organizationId })
        .select("holidayAllowance")
        .lean(),
      getEmployeeLeaveRequests(employeeId),
    ]);

    const items = [...leaveRequests, ...absences];

    const annualAllowanceDays =
      annualAllowance?.days ?? employee?.holidayAllowance ?? 0;
    const annualUsed = sumAnnualDaysUsed(
      employeeRequests.success ? employeeRequests.data : [],
    );
    const annual: AnnualLeaveSummary = {
      allowance: annualAllowanceDays,
      used: annualUsed,
      remaining: Math.max(annualAllowanceDays - annualUsed, 0),
    };

    let nonWorkingDates: Set<string> = new Set();
    if (items.length > 0) {
      const minStart = items.reduce(
        (min, item) => (item.startDate < min ? item.startDate : min),
        items[0].startDate,
      );
      const maxEnd = items.reduce(
        (max, item) => (item.endDate > max ? item.endDate : max),
        items[0].endDate,
      );
      nonWorkingDates = await getNonWorkingDays(
        organizationId,
        minStart,
        maxEnd,
      );
    }

    let sickThisPeriod = 0;
    for (const item of items) {
      const from =
        item.startDate > billingPeriodStartKey
          ? item.startDate
          : billingPeriodStartKey;
      const to = item.endDate < periodEndKey ? item.endDate : periodEndKey;
      if (from > to) continue;

      sickThisPeriod += getWorkingDays(from, to, nonWorkingDates).length;
    }

    const daysByWeekday = new Map<number, number>();
    const daysByMonth = new Map<string, number>();

    for (const item of items) {
      const from =
        item.startDate > periodStartKey ? item.startDate : periodStartKey;
      const to = item.endDate < periodEndKey ? item.endDate : periodEndKey;
      if (from > to) continue;

      for (const date of getWorkingDays(from, to, nonWorkingDates)) {
        const current = dayjs(date);
        const weekday = current.day();
        if (weekday >= 1 && weekday <= 5) {
          daysByWeekday.set(weekday, (daysByWeekday.get(weekday) ?? 0) + 1);
        }
        const monthKey = current.format("YYYY-MM");
        daysByMonth.set(monthKey, (daysByMonth.get(monthKey) ?? 0) + 1);
      }
    }

    const weekdayOccurrences = new Map<number, number>();
    const monthKeys: string[] = [];
    let cursor = periodStart;

    while (!cursor.isAfter(periodEnd, "day")) {
      const weekday = cursor.day();
      if (weekday >= 1 && weekday <= 5) {
        weekdayOccurrences.set(
          weekday,
          (weekdayOccurrences.get(weekday) ?? 0) + 1,
        );
      }
      const monthKey = cursor.format("YYYY-MM");
      if (monthKeys[monthKeys.length - 1] !== monthKey) {
        monthKeys.push(monthKey);
      }
      cursor = cursor.add(1, "day");
    }

    const sickByWeekday: SickWeekdayStat[] = WEEKDAY_LABELS.map(
      (label, index) => {
        const weekday = index + 1;
        const days = daysByWeekday.get(weekday) ?? 0;
        const occurrences = weekdayOccurrences.get(weekday) ?? 0;
        return {
          day: label,
          days,
          occurrences,
          average: occurrences > 0 ? days / occurrences : 0,
        };
      },
    );

    const sickByMonth: SickMonthStat[] = monthKeys.map((month) => ({
      month,
      days: daysByMonth.get(month) ?? 0,
    }));

    return {
      success: true,
      data: { sickByWeekday, sickByMonth, annual, sickThisPeriod },
    };
  } catch (error: unknown) {
    console.error("Error fetching employee leave stats:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch employee leave stats",
    };
  }
}

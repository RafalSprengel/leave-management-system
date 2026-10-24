import dayjs from "dayjs";
import LeaveRequest from "@/db/models/LeaveRequest";
import LeaveAllowance from "@/db/models/LeaveAllowance";
import Employee from "@/db/models/Employee";
import OrganizationSettings from "@/db/models/OrganizationSettings";
import Absence from "@/db/models/Absence";
import mongoose from "mongoose";
import { DEFAULT_LEAVE_ALLOWANCE_DAYS } from "@/constants/leaveAllowanceTypes";
import type { LeaveRequestType } from "@/constants/leaveTypes";
import { getBillingPeriod } from "@/utils/billingPeriod";
import { getNonWorkingDays } from "@/utils/nonWorkingDays";
import { countHolidayUsedInPeriod, resolveHolidayAllowance } from "@/utils/leaveBalance";
import { countWorkingDays } from "@/utils/workingDays";

export async function getLeaveRemaining(
    organizationId: string,
    employeeId: string,
    type: LeaveRequestType,
    anyDateInPeriod: string,
    includePending = false
): Promise<{ remaining: number; allowance: number; used: number; pending: number; period: { start: string; end: string } }> {
    const orgSettings = await OrganizationSettings.findOne({ organizationId }).select("holidayYearStart defaultAllowances").lean();
    const { start: periodStart, end: periodEnd } = getBillingPeriod(
        orgSettings?.holidayYearStart ?? "01-01",
        dayjs(anyDateInPeriod, "YYYY-MM-DD")
    );
    const employeeObjectId = new mongoose.Types.ObjectId(employeeId);
    const isHoliday = type === "holiday";

    const allowanceDoc = await LeaveAllowance.findOne({ organizationId, employee: employeeObjectId, type }).lean();

    const [requests, absenceDocs, employeeDoc, periodNonWorking] = await Promise.all([
        LeaveRequest.find({
            organizationId,
            employee: employeeObjectId,
            type,
            status: includePending ? { $in: ["approved", "pending"] } : "approved",
            startDate: { $lte: periodEnd },
            endDate: { $gte: periodStart },
        })
            .select("status startDate endDate startHalfDay endHalfDay")
            .lean(),
        isHoliday
            ? Absence.find({
                  organizationId,
                  employee: employeeObjectId,
                  startDate: { $lte: periodEnd },
                  endDate: { $gte: periodStart },
              })
                  .select("startDate endDate")
                  .lean()
            : Promise.resolve([]),
        allowanceDoc || !isHoliday ? Promise.resolve(null) : Employee.findById(employeeObjectId).select("holidayAllowance").lean(),
        getNonWorkingDays(organizationId, periodStart, periodEnd),
    ]);

    const orgDefault = (orgSettings?.defaultAllowances as unknown as Record<string, number> | undefined)?.[type];
    const allowance = isHoliday
        ? resolveHolidayAllowance({
              allowanceDays: allowanceDoc?.days,
              employeeHolidayAllowance: employeeDoc?.holidayAllowance,
              orgDefault,
              fallback: DEFAULT_LEAVE_ALLOWANCE_DAYS[type],
          })
        : allowanceDoc?.days ?? orgDefault ?? DEFAULT_LEAVE_ALLOWANCE_DAYS[type];

    const absences = isHoliday ? absenceDocs : [];
    const period = { startDate: periodStart, endDate: periodEnd };
    const used = countHolidayUsedInPeriod(
        requests.filter((req) => req.status === "approved"),
        absences,
        period,
        periodNonWorking
    );
    const pending = countHolidayUsedInPeriod(
        requests.filter((req) => req.status === "pending"),
        absences,
        period,
        periodNonWorking
    );

    return {
        remaining: Math.max(0, allowance - used - pending),
        allowance,
        used,
        pending,
        period: { start: periodStart, end: periodEnd },
    };
}

export async function getApprovedOverlap(
    organizationId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
    excludeRequestId?: string
) {
    const candidates = await LeaveRequest.find({
        ...(excludeRequestId ? { _id: { $ne: excludeRequestId } } : {}),
        organizationId,
        employee: new mongoose.Types.ObjectId(employeeId),
        status: "approved",
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
    }).lean();

    if (candidates.length === 0) return null;

    const nonWorkingDays = await getNonWorkingDays(organizationId, startDate, endDate);

    for (const candidate of candidates) {
        const from = candidate.startDate > startDate ? candidate.startDate : startDate;
        const to = candidate.endDate < endDate ? candidate.endDate : endDate;
        if (countWorkingDays(from, to, nonWorkingDays) > 0) {
            return candidate;
        }
    }
    return null;
}

/** Ile dni roboczych wniosku przypada na zakres (bez weekendow i dni niepracujacych). */
export async function countRequestWorkingDays(
    organizationId: string,
    startDate: string,
    endDate: string,
    startHalfDay = false,
    endHalfDay = false
): Promise<{ days: number; nonWorkingDays: Set<string> }> {
    const nonWorkingDays = await getNonWorkingDays(organizationId, startDate, endDate);
    let days = countWorkingDays(startDate, endDate, nonWorkingDays);
    if (startHalfDay) days -= 0.5;
    if (endHalfDay) days -= 0.5;
    return { days: Math.max(days, 0), nonWorkingDays };
}

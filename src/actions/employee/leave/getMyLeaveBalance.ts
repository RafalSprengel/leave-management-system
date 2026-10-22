"use server";

import connectDB from "@/db/connection";
import LeaveAllowance from "@/db/models/LeaveAllowance";
import LeaveRequest from "@/db/models/LeaveRequest";
import OrganizationSettings from "@/db/models/OrganizationSettings";
import { getCurrentEmployeeId } from "@/actions/shared/getCurrentEmployeeId";
import Absence from "@/db/models/Absence";
import { getOrganizationId } from "@/utils/getOrganizationId";
import { getNonWorkingDays } from "@/utils/nonWorkingDays";
import { LEAVE_REQUEST_TYPES, consumesAllowance, type LeaveRequestType } from "@/constants/leaveTypes";
import { DEFAULT_LEAVE_ALLOWANCE_DAYS } from "@/constants/leaveAllowanceTypes";
import mongoose from "mongoose";
import Employee from "@/db/models/Employee";
import { getBillingPeriod } from "@/utils/billingPeriod";
import { countHolidayUsedInPeriod, resolveHolidayAllowance } from "@/utils/leaveBalance";

export interface LeaveBalanceItem {
    type: LeaveRequestType;
    allowance: number;
    used: number;
    pending: number;
    remaining: number;
}

export type GetMyLeaveBalanceResult =
    | { success: true; data: LeaveBalanceItem[]; period: { start: string; end: string }; error: null }
    | { success: false; data: null; error: string };

export async function getMyLeaveBalance(): Promise<GetMyLeaveBalanceResult> {
    try {
        await connectDB();

        const organizationId = await getOrganizationId();
        const employeeId = await getCurrentEmployeeId();
        const employeeObjectId = new mongoose.Types.ObjectId(employeeId);

        const orgSettings = await OrganizationSettings.findOne({ organizationId }).lean();

        const rawDefaultAllowances = (orgSettings?.defaultAllowances ?? {}) as unknown as Record<string, number>;

        const perEmployeeAllowances = await LeaveAllowance.find({
            organizationId,
            employee: employeeObjectId,
        }).lean();

        const perEmployeeMap = new Map(perEmployeeAllowances.map((a) => [a.type, a.days]));

        const employeeHolidayAllowance = await Employee.findById(employeeObjectId)
            .select("holidayAllowance")
            .lean()
            .then((doc) => doc?.holidayAllowance ?? null);

        const { start: periodStartKey, end: periodEndKey } = getBillingPeriod(
            orgSettings?.holidayYearStart ?? "01-01",
        );

        const [approvedRequests, pendingRequests, absenceDocs] = await Promise.all([
            LeaveRequest.find({
                organizationId,
                employee: employeeObjectId,
                status: "approved",
                startDate: { $lte: periodEndKey },
                endDate: { $gte: periodStartKey },
            })
                .select("type startDate endDate startHalfDay endHalfDay")
                .lean(),
            LeaveRequest.find({
                organizationId,
                employee: employeeObjectId,
                status: "pending",
                startDate: { $lte: periodEndKey },
                endDate: { $gte: periodStartKey },
            })
                .select("type startDate endDate startHalfDay endHalfDay")
                .lean(),
            Absence.find({
                organizationId,
                employee: employeeObjectId,
                startDate: { $lte: periodEndKey },
                endDate: { $gte: periodStartKey },
            })
                .select("startDate endDate")
                .lean(),
        ]);

        const nonWorkingDays = await getNonWorkingDays(organizationId, periodStartKey, periodEndKey);
        const period = { startDate: periodStartKey, endDate: periodEndKey };

        const usedByType = new Map<string, number>();
        const pendingByType = new Map<string, number>();
        for (const type of LEAVE_REQUEST_TYPES) {
            const ofType = approvedRequests.filter((req) => req.type === type);
            const pendingOfType = pendingRequests.filter((req) => req.type === type);
            if (consumesAllowance(type) && type === "holiday") {
                usedByType.set(type, countHolidayUsedInPeriod(ofType, absenceDocs, period, nonWorkingDays));
                pendingByType.set(type, countHolidayUsedInPeriod(pendingOfType, absenceDocs, period, nonWorkingDays));
            } else {
                usedByType.set(
                    type,
                    countHolidayUsedInPeriod(
                        ofType.map((req) => ({ ...req, startHalfDay: false, endHalfDay: false })),
                        [],
                        period,
                        nonWorkingDays
                    )
                );
                pendingByType.set(
                    type,
                    countHolidayUsedInPeriod(
                        pendingOfType.map((req) => ({ ...req, startHalfDay: false, endHalfDay: false })),
                        [],
                        period,
                        nonWorkingDays
                    )
                );
            }
        }

        const data: LeaveBalanceItem[] = LEAVE_REQUEST_TYPES.map((type) => {
            const allowance: number =
                type === "holiday"
                    ? resolveHolidayAllowance({
                          allowanceDays: perEmployeeMap.get(type),
                          employeeHolidayAllowance: employeeHolidayAllowance,
                          orgDefault: rawDefaultAllowances[type],
                          fallback: DEFAULT_LEAVE_ALLOWANCE_DAYS[type],
                      })
                    : (perEmployeeMap.get(type) ?? rawDefaultAllowances[type] ?? DEFAULT_LEAVE_ALLOWANCE_DAYS[type]);

            const used = usedByType.get(type) ?? 0;
            const pending = pendingByType.get(type) ?? 0;
            return {
                type,
                allowance,
                used,
                pending,
                remaining: Math.max(0, allowance - used),
            };
        });

        return { success: true, data, period: { start: periodStartKey, end: periodEndKey }, error: null };
    } catch (error) {
        console.error("Error fetching leave balance:", error);
        return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : "Failed to load leave balance",
        };
    }
}

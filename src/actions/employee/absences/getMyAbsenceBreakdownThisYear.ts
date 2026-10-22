"use server";

import mongoose from "mongoose";

import dbConnect from "@/db/connection";
import Absence from "@/db/models/Absence";
import LeaveRequest from "@/db/models/LeaveRequest";
import OrganizationSettings from "@/db/models/OrganizationSettings";
import { getCurrentEmployeeId } from "@/actions/shared/getCurrentEmployeeId";
import { getBillingPeriod } from "@/utils/billingPeriod";
import { getOrganizationId } from "@/utils/getOrganizationId";
import { getNonWorkingDays } from "@/utils/nonWorkingDays";
import { countWorkingDays } from "@/utils/workingDays";

type DayRange = { type: string; startDate: string; endDate: string };

export async function getMyAbsenceBreakdownThisYear(): Promise<{
    success: boolean;
    unauthorised: number;
    other: number;
    unpaid: number;
    bereavement: number;
    error?: string;
}> {
    try {
        await dbConnect();
        const employeeId = await getCurrentEmployeeId();
        const organizationId = await getOrganizationId();

        const orgSettings = await OrganizationSettings.findOne({ organizationId })
            .select("holidayYearStart")
            .lean();
        const { start, end } = getBillingPeriod(orgSettings?.holidayYearStart ?? "01-01");
        const employeeObjectId = new mongoose.Types.ObjectId(employeeId);

        const [absences, requests, nonWorkingDates] = await Promise.all([
            Absence.find({
                organizationId,
                employee: employeeObjectId,
                type: { $in: ["unauthorised", "other"] },
                startDate: { $lte: end },
                endDate: { $gte: start },
            })
                .select("type startDate endDate")
                .lean(),
            LeaveRequest.find({
                organizationId,
                employee: employeeObjectId,
                type: { $in: ["unpaid", "bereavement"] },
                status: "approved",
                startDate: { $lte: end },
                endDate: { $gte: start },
            })
                .select("type startDate endDate")
                .lean(),
            getNonWorkingDays(organizationId, start, end),
        ]);

        const clampStart = (date: string) => (date < start ? start : date);
        const clampEnd = (date: string) => (date > end ? end : date);

        const sumDays = (items: DayRange[], type: string) =>
            items
                .filter((item) => item.type === type)
                .reduce(
                    (sum, item) =>
                        sum +
                        countWorkingDays(
                            clampStart(item.startDate),
                            clampEnd(item.endDate),
                            nonWorkingDates
                        ),
                    0
                );

        return {
            success: true,
            unauthorised: sumDays(absences, "unauthorised"),
            other: sumDays(absences, "other"),
            unpaid: sumDays(requests, "unpaid"),
            bereavement: sumDays(requests, "bereavement"),
        };
    } catch (error) {
        console.error("Error computing absence breakdown this year:", error);
        return {
            success: false,
            unauthorised: 0,
            other: 0,
            unpaid: 0,
            bereavement: 0,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to compute absence breakdown",
        };
    }
}

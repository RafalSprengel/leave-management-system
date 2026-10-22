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
import { countLeaveDaysInPeriod } from "@/utils/leaveBalance";

/**
 * Liczba dni chorobowych pracownika w biezacym okresie rozliczeniowym.
 * Sumuje nieobecnosci (Absence) typu "sick" oraz zatwierdzone wnioski (LeaveRequest)
 * typu "sick", liczone w dniach roboczych.
 */
export async function getMySickDaysThisYear(): Promise<{
    success: boolean;
    days: number;
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
                type: "sick",
                startDate: { $lte: end },
                endDate: { $gte: start },
            })
                .select("startDate endDate")
                .lean(),
            LeaveRequest.find({
                organizationId,
                employee: employeeObjectId,
                type: "sick",
                status: "approved",
                startDate: { $lte: end },
                endDate: { $gte: start },
            })
                .select("startDate endDate startHalfDay endHalfDay")
                .lean(),
            getNonWorkingDays(organizationId, start, end),
        ]);

        const period = { startDate: start, endDate: end };
        const days =
            absences.reduce((sum, item) => sum + countLeaveDaysInPeriod(item, period, [], nonWorkingDates), 0) +
            requests.reduce((sum, item) => sum + countLeaveDaysInPeriod(item, period, [], nonWorkingDates), 0);

        return { success: true, days };
    } catch (error) {
        console.error("Error computing sick days this year:", error);
        return {
            success: false,
            days: 0,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to compute sick days",
        };
    }
}

"use server";

import mongoose from "mongoose";

import dbConnect from "@/db/connection";
import Absence from "@/db/models/Absence";
import LeaveRequest from "@/db/models/LeaveRequest";
import OrganizationSettings from "@/db/models/OrganizationSettings";
import { getBillingPeriod } from "@/utils/billingPeriod";
import { getOrganizationId } from "@/utils/getOrganizationId";
import { getNonWorkingDays } from "@/utils/nonWorkingDays";
import { countHolidayUsedInPeriod } from "@/utils/leaveBalance";

export async function getEmployeeAnnualUsedDays(employeeId: string): Promise<{
    success: boolean;
    days: number;
    error?: string;
}> {
    try {
        await dbConnect();
        const organizationId = await getOrganizationId();

        const orgSettings = await OrganizationSettings.findOne({ organizationId })
            .select("holidayYearStart")
            .lean();
        const { start, end } = getBillingPeriod(orgSettings?.holidayYearStart ?? "01-01");

        const employeeObjectId = new mongoose.Types.ObjectId(employeeId);

        const [requests, absences] = await Promise.all([
            LeaveRequest.find({
                organizationId,
                employee: employeeObjectId,
                type: "holiday",
                status: "approved",
                startDate: { $lte: end },
                endDate: { $gte: start },
            })
                .select("startDate endDate startHalfDay endHalfDay")
                .lean(),
            Absence.find({
                organizationId,
                employee: employeeObjectId,
                startDate: { $lte: end },
                endDate: { $gte: start },
            })
                .select("startDate endDate")
                .lean(),
        ]);

        const nonWorkingDates = await getNonWorkingDays(organizationId, start, end);

        const days = countHolidayUsedInPeriod(
            requests,
            absences,
            { startDate: start, endDate: end },
            nonWorkingDates,
        );

        return { success: true, days };
    } catch (error) {
        console.error("Error computing annual days used:", error);
        return {
            success: false,
            days: 0,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to compute annual days used",
        };
    }
}

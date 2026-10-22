"use server";

import connectDB from "@/db/connection";
import LeaveRequest from "@/db/models/LeaveRequest";
import dayjs from "dayjs";
import { getOrganizationId } from "@/utils/getOrganizationId";
import { getApprovedOverlap, getHolidayRemaining, countRequestWorkingDays } from "@/utils/leaveRules";
import { formatDateList } from "@/utils/formatDateList";
import { revalidatePath } from "next/cache";
import { CreateLeaveRequestParams } from "@/types/leaveRequest";
import { getCurrentEmployeeId } from "@/actions/shared/getCurrentEmployeeId";
import Employee from "@/db/models/Employee";
import OrganizationSettings from "@/db/models/OrganizationSettings";
import { getBillingPeriod } from "@/utils/billingPeriod";

export async function createLeaveRequest(data: CreateLeaveRequestParams) {
    try {
        await connectDB();

        if (!data.userId) {
            return { success: false, error: "Please select an employee" };
        }

        if (!data.startDate || !data.endDate) {
            return { success: false, error: "Please select start and end dates" };
        }

        const orgId = await getOrganizationId();

        if (!orgId) {
            return { success: false, error: "Organization ID is missing or undefined" };
        }

        const start = dayjs(data.startDate, "YYYY-MM-DD");
        const end = dayjs(data.endDate, "YYYY-MM-DD");

        if (!start.isValid() || !end.isValid() || start.isAfter(end)) {
            return { success: false, error: "Invalid date range selected" };
        }

        const orgSettings = await OrganizationSettings.findOne({ organizationId: orgId })
            .select("holidayYearStart")
            .lean();
        const holidayYearStart = orgSettings?.holidayYearStart ?? "01-01";
        const startPeriod = getBillingPeriod(holidayYearStart, start);
        const endPeriod = getBillingPeriod(holidayYearStart, end);

        if (startPeriod.start !== endPeriod.start) {
            return {
                success: false,
                error: `Request spans two holiday years (${startPeriod.start} – ${startPeriod.end} and ${endPeriod.start} – ${endPeriod.end}). Please split it into separate requests.`,
            };
        }

        const startStr = start.format("YYYY-MM-DD");
        const endStr = end.format("YYYY-MM-DD");

        const { days: daysRequested, nonWorkingDays } = await countRequestWorkingDays(
            orgId,
            startStr,
            endStr,
            !!data.startHalfDay,
            !!data.endHalfDay
        );

        if (nonWorkingDays.size > 0) {
            return {
                success: false,
                error: `Selected range includes non-working days (${formatDateList([
                    ...nonWorkingDays,
                ])}). Please choose a range without bank holidays or company closures.`,
            };
        }

        if (daysRequested <= 0) {
            return { success: false, error: "Selected range contains no working days" };
        }

        const overlap = await getApprovedOverlap(orgId, data.userId, startStr, endStr);
        if (overlap) {
            return {
                success: false,
                error: `Selected dates overlap with an approved leave request for this employee (${overlap.startDate} – ${overlap.endDate}).`,
            };
        }

        if ((data.type ?? "holiday") === "holiday") {
            const { remaining } = await getHolidayRemaining(orgId, data.userId, startStr);
            if (daysRequested > remaining) {
                return {
                    success: false,
                    error: `Not enough holiday days: requested ${daysRequested}, remaining ${remaining} in the current holiday year.`,
                };
            }
        }

        const adminId = await getCurrentEmployeeId();

        const [employeeDoc, adminDoc] = await Promise.all([
            Employee.findById(data.userId)
                .populate("department", "name")
                .populate("managerId", "firstName lastName")
                .lean(),
            Employee.findById(adminId).lean(),
        ]);

        const dept = employeeDoc?.department as { name?: string } | undefined;
        const mgr = employeeDoc?.managerId as { firstName?: string; lastName?: string } | undefined;

        const employeeInfo = {
            employeeName: employeeDoc ? `${employeeDoc.firstName} ${employeeDoc.lastName}` : "Unknown",
            employeeEmail: employeeDoc?.email || "",
            departmentName: dept?.name || "",
            managerName: mgr ? `${mgr.firstName} ${mgr.lastName}` : "",
            reviewedByName: adminDoc ? `${adminDoc.firstName} ${adminDoc.lastName}` : "",
        };

        const newLeaveRequest = await LeaveRequest.create({
            employee: data.userId,
            organizationId: orgId,
            startDate: start.format("YYYY-MM-DD"),
            endDate: end.format("YYYY-MM-DD"),
            startHalfDay: data.startHalfDay || false,
            endHalfDay: data.endHalfDay || false,
            type: data.type ?? "holiday",
            status: "approved",
            createdBy: adminId,
            reviewedBy: adminId,
            reviewedAt: new Date(),
            ...employeeInfo,
        });

        revalidatePath("/team/leave-requests");

        return {
            success: true,
            data: JSON.parse(JSON.stringify(newLeaveRequest)),
            error: null,
        };
    } catch (error: unknown) {
        console.error("Error creating leave request as admin:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to create leave request",
        };
    }
}
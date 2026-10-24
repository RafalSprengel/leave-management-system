"use server";

import connectDB from "@/db/connection";
import LeaveRequest from "@/db/models/LeaveRequest";
import { getCurrentEmployeeRole } from "@/actions/shared/getCurrentEmployeeRole";
import { getOrganizationId } from "@/utils/getOrganizationId";

export interface TeamApprovedLeaveItem {
    _id: string;
    employee: string;
    employeeName: string;
    type: string;
    startDate: string;
    endDate: string;
    startHalfDay: boolean;
    endHalfDay: boolean;
}

export async function getTeamApprovedLeaveRequestsInRange(startDate: string, endDate: string) {
    try {
        const { success, role } = await getCurrentEmployeeRole();
        if (!success || role !== "Manager") {
            return { success: false, data: [] as TeamApprovedLeaveItem[], error: "Forbidden: managers only" };
        }

        if (!startDate || !endDate || startDate > endDate) {
            return { success: false, data: [] as TeamApprovedLeaveItem[], error: "Invalid date range" };
        }

        await connectDB();
        const orgId = await getOrganizationId();

        if (!orgId) {
            return { success: false, data: [] as TeamApprovedLeaveItem[], error: "Organization ID is missing" };
        }

        const leaveRequests = await LeaveRequest.find({
            organizationId: orgId,
            status: "approved",
            startDate: { $lte: endDate },
            endDate: { $gte: startDate },
        })
            .select("employee employeeName type startDate endDate startHalfDay endHalfDay")
            .lean();

        const data: TeamApprovedLeaveItem[] = leaveRequests
            .filter((request) => !!request.employee)
            .map((request) => ({
                _id: request._id.toString(),
                employee: String(request.employee),
                employeeName: request.employeeName ?? "",
                type: request.type,
                startDate: request.startDate,
                endDate: request.endDate,
                startHalfDay: !!request.startHalfDay,
                endHalfDay: !!request.endHalfDay,
            }));

        return { success: true, data, error: null };
    } catch (error: unknown) {
        console.error("Error fetching team approved leave requests:", error);
        return {
            success: false,
            data: [] as TeamApprovedLeaveItem[],
            error: error instanceof Error ? error.message : "Failed to fetch approved leave requests",
        };
    }
}

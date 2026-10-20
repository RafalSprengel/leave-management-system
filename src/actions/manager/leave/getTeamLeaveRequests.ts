"use server";

import connectDB from "@/db/connection";
import LeaveRequest from "@/db/models/LeaveRequest";
import { getOrganizationId } from "@/utils/getOrganizationId";
import type { TeamLeaveRequestItem } from "@/types/leaveRequest";
import { addChargedDays } from "@/utils/enrichLeaveRequests";
import { getCurrentEmployeeRole } from "@/actions/shared/getCurrentEmployeeRole";

export async function getTeamLeaveRequests() {
    try {
        const { success, role } = await getCurrentEmployeeRole();
        if (!success || role !== "Manager") {
            return { success: false, error: "Forbidden: managers only" };
        }

        await connectDB();
        const orgId = await getOrganizationId();

        if (!orgId) {
            return { success: false, error: "Organization ID is missing" };
        }

        const leaveRequests = await LeaveRequest.find({ organizationId: orgId })
            .sort({ createdAt: -1 })
            .lean();

        const parsed = JSON.parse(JSON.stringify(leaveRequests)) as TeamLeaveRequestItem[];

        return {
            success: true,
            data: await addChargedDays(parsed, orgId),
        };
    } catch (error: unknown) {
        console.error("Error fetching team leave requests:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch leave requests",
        };
    }
}
"use server";

import connectDB from "@/db/connection";
import Employee from "@/db/models/Employee";
import LeaveRequest from "@/db/models/LeaveRequest";
import { getCachedSession } from "@/lib/session";
import type { TeamLeaveRequestItem } from "@/types/leaveRequest";
import { addChargedDays } from "@/utils/enrichLeaveRequests";
import { getOrganizationId } from "@/utils/getOrganizationId";

export async function getColleagueApprovedLeaveRequests() {
  try {
    const session = await getCachedSession();
    if (!session?.user) {
      return { success: false, error: "Unauthorized: No active session" };
    }

    await connectDB();
    const organizationId = await getOrganizationId();

    const me = await Employee.findOne({ userId: session.user.id }).lean();
    if (!me || !me.department) {
      return { success: true, data: [] };
    }

    const colleagueIds = await Employee.find({
      organizationId,
      department: me.department,
      _id: { $ne: me._id },
    })
      .select("_id")
      .lean();

    const leaveRequests = await LeaveRequest.find({
      organizationId,
      status: "approved",
      employee: { $in: colleagueIds.map((c) => c._id) },
    })
      .sort({ createdAt: -1 })
      .lean();

    const parsed = JSON.parse(
      JSON.stringify(leaveRequests),
    ) as TeamLeaveRequestItem[];

    return {
      success: true,
      data: await addChargedDays(parsed, organizationId),
    };
  } catch (error: unknown) {
    console.error("Error fetching colleague leave requests:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch leave requests",
    };
  }
}

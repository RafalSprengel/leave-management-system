"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { getCurrentEmployeeId } from "@/actions/shared/getCurrentEmployeeId";
import connectDB from "@/db/connection";
import Employee from "@/db/models/Employee";
import LeaveRequest from "@/db/models/LeaveRequest";
import {
    buildLeaveRequestApprovedEmail,
    buildLeaveRequestRejectedEmail,
    toLeaveRequestEmailData,
} from "@/lib/emails/leaveRequestEmails";
import { sendEmail } from "@/lib/sendEmail";
import { getOrganizationId } from "@/utils/getOrganizationId";
import { getApprovedOverlap, getHolidayRemaining, countRequestWorkingDays } from "@/utils/leaveRules";

async function getCurrentEmployee() {
    const employeeId = await getCurrentEmployeeId();
    const employee = await Employee.findById(employeeId).lean();
    return {
        id: employeeId,
        name: employee ? `${employee.firstName} ${employee.lastName}` : "",
    };
}

export async function approveLeaveRequestAsAdmin(id: string) {
    try {
        await connectDB();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return { success: false, error: "Leave request not found." };
        }

        const organizationId = await getOrganizationId();
        const { id: reviewerId, name: reviewerName } = await getCurrentEmployee();

        const request = await LeaveRequest.findOne({ _id: id, organizationId });

        if (!request) {
            return { success: false, error: "Leave request not found." };
        }

        if (request.status === "cancelled") {
            return { success: false, error: "Cannot approve a cancelled leave request." };
        }

        if (request.status === "approved") {
            return { success: false, error: "Leave request is already approved." };
        }

        const overlappingApproved = await getApprovedOverlap(
            organizationId,
            String(request.employee),
            request.startDate,
            request.endDate,
            String(request._id)
        );

        if (overlappingApproved) {
            return {
                success: false,
                error: `Cannot approve: this request overlaps with an already approved request (${overlappingApproved.startDate} – ${overlappingApproved.endDate}).`,
            };
        }

        if (request.type === "holiday") {
            const { days } = await countRequestWorkingDays(
                organizationId,
                request.startDate,
                request.endDate,
                request.startHalfDay,
                request.endHalfDay
            );
            const { remaining } = await getHolidayRemaining(organizationId, String(request.employee), request.startDate);

            if (days > remaining) {
                return {
                    success: false,
                    error: `Cannot approve: requested ${days} day(s), remaining holiday balance is ${remaining}.`,
                };
            }
        }

        request.status = "approved";
        request.reviewedBy = reviewerId;
        request.reviewedAt = new Date();
        request.reviewedByName = reviewerName;
        request.rejectionReason = null;
        await request.save();

        revalidatePath("/team/leave-requests");
        revalidatePath("/me/leave-requests");
        revalidatePath(`/team/leave-requests/${id}`);
        revalidatePath(`/me/leave-requests/${id}`);

        // Best-effort notification — the status change is already persisted.
        // Idempotency comes from the guards above: an already approved request
        // returns early, so this e-mail is only sent on a real transition.
        const employeeEmail = request.employeeEmail?.trim();

        if (!employeeEmail) {
            console.log("[approveLeaveRequestAsAdmin] No employee email — skipping notification");
        } else {
            try {
                await sendEmail({
                    to: employeeEmail,
                    ...buildLeaveRequestApprovedEmail(toLeaveRequestEmailData(request)),
                });
                console.log(`[approveLeaveRequestAsAdmin] Approval email sent for request ${id}`);
            } catch (emailError) {
                console.error(
                    "[approveLeaveRequestAsAdmin] Failed to send approval email:",
                    emailError instanceof Error ? emailError.message : emailError
                );
            }
        }

        return { success: true, error: null };
    } catch (error: unknown) {
        console.error("Error approving leave request as admin:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to approve leave request",
        };
    }
}

export async function rejectLeaveRequestAsAdmin(id: string, rejectionReason?: string) {
    try {
        await connectDB();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return { success: false, error: "Leave request not found." };
        }

        const organizationId = await getOrganizationId();
        const { id: reviewerId, name: reviewerName } = await getCurrentEmployee();

        const request = await LeaveRequest.findOne({ _id: id, organizationId });

        if (!request) {
            return { success: false, error: "Leave request not found." };
        }

        if (request.status === "cancelled") {
            return { success: false, error: "Cannot reject a cancelled leave request." };
        }

        if (request.status === "rejected") {
            return { success: false, error: "Leave request is already rejected." };
        }

        request.status = "rejected";
        request.reviewedBy = reviewerId;
        request.reviewedAt = new Date();
        request.reviewedByName = reviewerName;
        request.rejectionReason = rejectionReason?.trim() || null;
        await request.save();

        revalidatePath("/team/leave-requests");
        revalidatePath("/me/leave-requests");
        revalidatePath(`/team/leave-requests/${id}`);
        revalidatePath(`/me/leave-requests/${id}`);

        // Best-effort notification — the status change is already persisted.
        // Idempotency comes from the guards above: an already rejected request
        // returns early, so this e-mail is only sent on a real transition.
        const employeeEmail = request.employeeEmail?.trim();

        if (!employeeEmail) {
            console.log("[rejectLeaveRequestAsAdmin] No employee email — skipping notification");
        } else {
            try {
                await sendEmail({
                    to: employeeEmail,
                    ...buildLeaveRequestRejectedEmail(toLeaveRequestEmailData(request)),
                });
                console.log(`[rejectLeaveRequestAsAdmin] Rejection email sent for request ${id}`);
            } catch (emailError) {
                console.error(
                    "[rejectLeaveRequestAsAdmin] Failed to send rejection email:",
                    emailError instanceof Error ? emailError.message : emailError
                );
            }
        }

        return { success: true, error: null };
    } catch (error: unknown) {
        console.error("Error rejecting leave request as admin:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to reject leave request",
        };
    }
}
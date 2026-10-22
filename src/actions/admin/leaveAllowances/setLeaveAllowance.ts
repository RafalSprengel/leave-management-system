"use server";

import dbConnect from "@/db/connection";
import Employee from "@/db/models/Employee";
import LeaveAllowance from "@/db/models/LeaveAllowance";
import { getOrganizationId } from "@/utils/getOrganizationId";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import type {
    SetLeaveAllowanceInput,
    SetLeaveAllowanceResult,
} from "@/types/leaveAllowance";

export async function setLeaveAllowance(
    input: SetLeaveAllowanceInput
): Promise<SetLeaveAllowanceResult> {
    try {
        const { employeeId, type, days } = input;

        if (!employeeId) {
            return { success: false, data: null, error: "Employee is required." };
        }

        if (!Number.isFinite(days) || days < 0) {
            return {
                success: false,
                data: null,
                error: "Please enter a valid non-negative number of days.",
            };
        }

        await dbConnect();
        const organizationId = await getOrganizationId();

        const employee = await Employee.findOne({
            _id: employeeId,
            organizationId,
        }).lean();

        if (!employee) {
            return { success: false, data: null, error: "Employee not found." };
        }

        const employeeObjectId = new mongoose.Types.ObjectId(employeeId);

        const doc = await LeaveAllowance.findOneAndUpdate(
            { organizationId, employee: employeeObjectId, type },
            { $set: { days } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).lean();

        if (!doc) {
            return {
                success: false,
                data: null,
                error: "Failed to save leave allowance.",
            };
        }

        // Keep the legacy annual allowance field in sync so existing views keep working.
        if (type === "holiday") {
            await Employee.updateOne(
                { _id: employeeId, organizationId },
                { $set: { holidayAllowance: days } }
            );
        }

        revalidatePath(`/team/employees/${employeeId}/allowances`);
        revalidatePath("/me");

        return {
            success: true,
            data: {
                id: doc._id.toString(),
                employee: employeeId,
                type,
                days,
            },
            error: null,
        };
    } catch (error) {
        console.error("Error setting leave allowance:", error);
        return {
            success: false,
            data: null,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to set leave allowance",
        };
    }
}

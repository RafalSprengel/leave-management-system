"use server";

import dbConnect from "@/db/connection";
import Employee from "@/db/models/Employee";
import LeaveAllowance from "@/db/models/LeaveAllowance";
import mongoose from "mongoose";
import type { ICreateEmployeeInput, IEmployee } from "@/types/employees";
import { getOrganizationId } from "@/utils/getOrganizationId";
import { getAuth } from "@/lib/auth";
import {
    LEAVE_ALLOWANCE_TYPES,
    type LeaveAllowanceType,
} from "@/constants/leaveAllowanceTypes";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function createEmployee(data: ICreateEmployeeInput): Promise<{ success: boolean; data?: IEmployee; error?: string; errorCode?: string }> {
    try {
        await dbConnect();
        const organizationId = await getOrganizationId();

        const employee = await Employee.create({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            role: data.role as "Manager" | "Employee",
            department: new mongoose.Types.ObjectId(data.department),
            holidayAllowance: data.holidayAllowance,
            employmentDate: new Date(data.employmentDate),
            ...(data.managerId ? { managerId: new mongoose.Types.ObjectId(data.managerId) } : {}),
            organizationId,
            status: "invited" as const,
        });

        // Send the actual Better Auth organization invitation so the new
        // hire gets an email and can create their account via
        // /accept-invitation/[id]. Without this, the Employee row above is
        // just a placeholder nobody can ever activate.
        try {
            const auth = await getAuth();
            const invitation = await auth.api.createInvitation({
                body: {
                    email: data.email,
                    role: data.role === "Manager" ? "admin" : "member",
                    organizationId,
                },
                headers: await headers(),
            });
            console.log(`[createEmployee] Invitation created successfully for ${data.email}, invitationId=${invitation?.id}`);
            // Email jest wysyłany automatycznie przez Better Auth poprzez callback sendInvitationEmail w src/lib/auth.ts
        } catch (invitationError) {
            console.error("[createEmployee] Invitation creation failed:", invitationError instanceof Error ? invitationError.message : invitationError);
            // Roll back the Employee row so we don't leave behind an
            // "invited" placeholder that can never actually be invited.
            await employee.deleteOne();
            throw invitationError;
        }

        // Persist per-type allowances (annual comes from holidayAllowance).
        const allowanceEntries: [string, number][] = [
            ["holiday", data.holidayAllowance],
            ...Object.entries(data.allowances ?? {}),
        ];
        const validAllowances = allowanceEntries.filter(
            ([type, days]) =>
                (LEAVE_ALLOWANCE_TYPES as readonly string[]).includes(type) &&
                Number.isFinite(days)
        );
        if (validAllowances.length > 0) {
            await LeaveAllowance.insertMany(
                validAllowances.map(([type, days]) => ({
                    organizationId,
                    employee: employee._id,
                    type: type as LeaveAllowanceType,
                    days,
                })),
                { ordered: false }
            );
        }

        revalidatePath("/team/employees");
        return { success: true };
    } catch (error: any) {
        console.error("Error creating employee:", error);

        if (error?.code === 11000) {
            return { success: false, error: "An employee with this email already exists.", errorCode: "DUPLICATE_EMAIL" };
        }

        return { success: false, error: error instanceof Error ? error.message : "Failed to create employee" };
    }
}
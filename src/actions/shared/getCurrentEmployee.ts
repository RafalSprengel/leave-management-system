"use server";

import { getCachedSession } from "@/lib/session";
import dbConnect from "@/db/connection";
import Employee from "@/db/models/Employee";
import type { IEmployee } from "@/types/employees";
import { getOrganizationId } from "@/utils/getOrganizationId";

export async function getCurrentEmployee(): Promise<{
    success: boolean;
    data: IEmployee | null;
    error: string | null;
}> {
    try {
        const session = await getCachedSession();

        if (!session?.user) {
            return { success: false, data: null, error: "Unauthorized: No active session" };
        }

        await dbConnect();

        const organizationId = await getOrganizationId();

        const employee = await Employee.findOne({ userId: session.user.id, organizationId })
            .populate("department")
            .lean();

        if (!employee) {
            return {
                success: false,
                data: null,
                error: "No Employee profile linked to this account",
            };
        }

        return {
            success: true,
            data: JSON.parse(JSON.stringify(employee)),
            error: null,
        };
    } catch (error) {
        console.error("Error fetching current employee:", error);

        return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : "An error occurred",
        };
    }
}
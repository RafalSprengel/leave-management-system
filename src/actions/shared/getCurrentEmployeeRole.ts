"use server";

import { getCachedFreshSession, getCachedSession } from "@/lib/session";
import dbConnect from "@/db/connection";
import Employee from "@/db/models/Employee";

type SessionShape = {
    user: { id: string };
    session: { activeOrganizationId?: string | null };
};

export async function getCurrentEmployeeRole(options?: {
    freshSession?: boolean;
    preloadedSession?: SessionShape | null;
}): Promise<{
    success: boolean;
    role: "Manager" | "Employee" | null;
    error: string | null;
}> {
    try {
        let session: SessionShape | null | undefined = options?.preloadedSession;

        if (!session) {
            const fetched = options?.freshSession
                ? await getCachedFreshSession()
                : await getCachedSession();
            session = fetched as SessionShape | null;
        }

        if (!session?.user) {
            return { success: false, role: null, error: "Unauthorized: No active session" };
        }

        const resolvedUserId = session.user.id;
        const organizationId = session.session?.activeOrganizationId;

        if (!organizationId) {
            return { success: false, role: null, error: "No active organization" };
        }

        await dbConnect();

        const employee = await Employee.findOne({ userId: resolvedUserId, organizationId }).lean();

        if (!employee) {
            return { success: false, role: null, error: "No Employee profile linked to this account" };
        }

        // Block deactivated employees from accessing the app
        if (employee.status === "inactive") {
            return { success: false, role: null, error: "Account is deactivated" };
        }

        // Owners and Managers get manager-level access routing.
        // Check both the Employee's isOwner flag (faster) and Better Auth's
        // member collection (source of truth) as a fallback, so even if the
        // afterAddMember hook didn't set isOwner, the system still works.
        if (employee.isOwner || employee.role === "Manager") {
            return { success: true, role: "Manager", error: null };
        }

        return { success: true, role: employee.role, error: null };
    } catch (error) {
        console.error("Error fetching current employee role:", error);

        return {
            success: false,
            role: null,
            error: error instanceof Error ? error.message : "An error occurred",
        };
    }
}
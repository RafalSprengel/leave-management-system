"use server";

import { headers } from "next/headers";
import dbConnect from "@/db/connection";
import OrganizationSettings from "@/db/models/OrganizationSettings";
import { getAuth } from "@/lib/auth";
import { getOrganizationId } from "@/utils/getOrganizationId";
import { revalidatePath } from "next/cache";
import type { IOrgSettings, UpdateOrgSettingsResult } from "@/types/orgSettings";

export async function updateOrgSettings(
    data: Partial<IOrgSettings>
): Promise<UpdateOrgSettingsResult> {
    try {
        await dbConnect();
        const organizationId = await getOrganizationId();

        const doc = await OrganizationSettings.findOneAndUpdate(
            { organizationId },
            { $set: { ...data, organizationId } },
            { upsert: true, new: true, runValidators: true }
        );

        // Keep the Better Auth organization name in sync with the company name.
        // `organization.name` is what the invitation email uses (see
        // src/lib/auth.ts), so without this it would keep showing the name that
        // was set once during onboarding.
        if (data.companyName) {
            try {
                const auth = await getAuth();
                await auth.api.updateOrganization({
                    body: {
                        organizationId,
                        data: { name: data.companyName },
                    },
                    headers: await headers(),
                });
            } catch (syncError) {
                // Non-fatal: the settings are saved either way and the name is
                // pushed to Better Auth on the next successful save.
                console.error(
                    "[updateOrgSettings] Failed to sync the organization name with Better Auth:",
                    syncError instanceof Error ? syncError.message : syncError
                );
            }
        }

        revalidatePath("/team/settings");

        return {
            success: true,
            data: {
                companyName: doc.companyName,
                timezone: doc.timezone,
                country: doc.country,
                address: doc.address ?? "",
                website: doc.website ?? "",
                holidayYearStart: doc.holidayYearStart,
                defaultAnnualLeaveDays: doc.defaultAnnualLeaveDays,
                allowCarryOver: doc.allowCarryOver,
                maxCarryOverDays: doc.maxCarryOverDays,
                autoApproveSickLeave: doc.autoApproveSickLeave,
                defaultAllowances: Object.fromEntries(doc.defaultAllowances ?? []),
            },
            error: null,
        };
    } catch (error) {
        console.error("Error updating org settings:", error);
        return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : "Failed to save settings",
        };
    }
}

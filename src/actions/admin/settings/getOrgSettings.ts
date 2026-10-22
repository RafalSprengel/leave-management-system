"use server";

import dbConnect from "@/db/connection";
import OrganizationSettings from "@/db/models/OrganizationSettings";
import { getOrganizationId } from "@/utils/getOrganizationId";
import type { GetOrgSettingsResult, IOrgSettings } from "@/types/orgSettings";

const DEFAULTS: IOrgSettings = {
    companyName: "",
    timezone: "Europe/London",
    country: "GB",
    address: "",
    website: "",
    holidayYearStart: "01-01",
    defaultAnnualLeaveDays: 26,
    allowCarryOver: true,
    maxCarryOverDays: 5,
    autoApproveSickLeave: false,
    defaultAllowances: {},
};

function toPlain(doc: InstanceType<typeof OrganizationSettings>): IOrgSettings {
    return {
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
    };
}

export async function getOrgSettings(): Promise<GetOrgSettingsResult> {
    try {
        await dbConnect();
        const organizationId = await getOrganizationId();

        const doc = await OrganizationSettings.findOne({ organizationId });

        if (!doc) {
            return { success: true, data: DEFAULTS, error: null };
        }

        return { success: true, data: toPlain(doc), error: null };
    } catch (error) {
        console.error("Error fetching org settings:", error);
        return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : "Failed to load settings",
        };
    }
}

export interface IOrgSettings {
    companyName: string;
    timezone: string;
    country: string;
    address: string;
    website: string;

    /** Format: "MM-DD" */
    holidayYearStart: string;

    defaultAnnualLeaveDays: number;
    allowCarryOver: boolean;
    maxCarryOverDays: number;
    autoApproveSickLeave: boolean;

    /** Default per-type allowances (in days) applied to new employees. Keyed by LeaveAllowanceType. */
    defaultAllowances: Record<string, number>;
}

export type GetOrgSettingsResult =
    | { success: true; data: IOrgSettings; error: null }
    | { success: false; data: null; error: string };

export type UpdateOrgSettingsResult =
    | { success: true; data: IOrgSettings; error: null }
    | { success: false; data: null; error: string };

import mongoose, { type Document, type Model, Schema } from "mongoose";

import { DEFAULT_LEAVE_ALLOWANCE_DAYS } from "@/constants/leaveAllowanceTypes";

export interface IOrganizationSettings extends Document {
    organizationId: string;

    companyName: string;
    timezone: string;
    country: string;
    address?: string;
    website?: string;

    /** Format: "MM-DD", e.g. "01-01" or "04-01" */
    holidayYearStart: string;
    /** Format: "MM-DD", e.g. "12-31" or "03-31" */
    holidayYearEnd: string;

    defaultAnnualLeaveDays: number;
    allowCarryOver: boolean;
    maxCarryOverDays: number;
    autoApproveSickLeave: boolean;

    /** Default per-type allowances (in days) applied to new employees. Keyed by LeaveAllowanceType. */
    defaultAllowances: Map<string, number>;

    createdAt: Date;
    updatedAt: Date;
}

const OrganizationSettingsSchema = new Schema<IOrganizationSettings>(
    {
        organizationId: {
            type: String,
            required: true,
        },

        companyName: { type: String, default: "", trim: true },
        timezone: { type: String, default: "Europe/London", trim: true },
        country: { type: String, default: "GB", trim: true },
        address: { type: String, default: "", trim: true },
        website: { type: String, default: "", trim: true },

        holidayYearStart: {
            type: String,
            default: "01-01",
            match: [/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Invalid format, expected MM-DD"],
        },
        holidayYearEnd: {
            type: String,
            default: "12-31",
            match: [/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Invalid format, expected MM-DD"],
        },

        defaultAnnualLeaveDays: { type: Number, default: 26, min: 0, max: 365 },
        allowCarryOver: { type: Boolean, default: true },
        maxCarryOverDays: { type: Number, default: 5, min: 0, max: 365 },
        autoApproveSickLeave: { type: Boolean, default: false },

        defaultAllowances: {
            type: Map,
            of: Number,
            default: () => new Map(Object.entries(DEFAULT_LEAVE_ALLOWANCE_DAYS)),
        },
    },
    { timestamps: true }
);

OrganizationSettingsSchema.index({ organizationId: 1 }, { unique: true });

const OrganizationSettings: Model<IOrganizationSettings> =
    (mongoose.models.OrganizationSettings as Model<IOrganizationSettings>) ||
    mongoose.model<IOrganizationSettings>("OrganizationSettings", OrganizationSettingsSchema);

export default OrganizationSettings;

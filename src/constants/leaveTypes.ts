/**
 * Single source of truth for leave request types.
 * To add/remove a leave type in the future, edit this file only.
 */

export const LEAVE_REQUEST_TYPES = [
    "holiday",
    "sick",
    "unpaid",
    "bereavement",
] as const;

export type LeaveRequestType = (typeof LEAVE_REQUEST_TYPES)[number];

export interface LeaveTypeMeta {
    /** Display label used across the UI. */
    label: string;
    /** Mantine color used for badges/calendar events. */
    color: string;
    /** Whether this type is deducted from the employee's allowance pool. */
    consumesAllowance: boolean;
    /** When true, there is no day limit (unlimited). */
    unlimited: boolean;
}

export const LEAVE_TYPE_META: Record<LeaveRequestType, LeaveTypeMeta> = {
    holiday: {
        label: "Holiday",
        color: "blue",
        consumesAllowance: true,
        unlimited: false,
    },
    sick: {
        label: "Sick",
        color: "red",
        consumesAllowance: true,
        unlimited: false,
    },
    unpaid: {
        label: "Unpaid leave",
        color: "orange",
        consumesAllowance: true,
        unlimited: false,
    },
    bereavement: {
        label: "Bereavement",
        color: "violet",
        consumesAllowance: true,
        unlimited: false,
    },
};

/** Label for any type value (falls back to the raw value for unknown types). */
export function getLeaveTypeLabel(type: string): string {
    return LEAVE_TYPE_META[type as LeaveRequestType]?.label ?? type;
}

/** Mantine color for any type value (falls back to "gray"). */
export function getLeaveTypeColor(type: string): string {
    return LEAVE_TYPE_META[type as LeaveRequestType]?.color ?? "gray";
}

/** Whether a given type is deducted from the allowance pool. */
export function consumesAllowance(type: string): boolean {
    return LEAVE_TYPE_META[type as LeaveRequestType]?.consumesAllowance ?? false;
}

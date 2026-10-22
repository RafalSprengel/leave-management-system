/**
 * Single source of truth for leave allowance types (per-type day limits).
 * To add/remove an allowance type in the future, edit this file only.
 */

export const LEAVE_ALLOWANCE_TYPES = [
    "holiday",
    "unpaid",
    "sick",
    "bereavement",
] as const;

export type LeaveAllowanceType = (typeof LEAVE_ALLOWANCE_TYPES)[number];

export const LEAVE_ALLOWANCE_LABELS: Record<LeaveAllowanceType, string> = {
    holiday: "Holiday",
    unpaid: "Unpaid leave",
    sick: "Sick",
    bereavement: "Bereavement",
};

export function getLeaveAllowanceLabel(type: string): string {
    return LEAVE_ALLOWANCE_LABELS[type as LeaveAllowanceType] ?? type;
}

/**
 * Days granted by default for each allowance type.
 * Single source of truth used to seed organization defaults, the
 * "new employee" form and leave-balance fallbacks.
 */
export const DEFAULT_LEAVE_ALLOWANCE_DAYS: Record<LeaveAllowanceType, number> = {
    holiday: 26,
    unpaid: 0,
    sick: 90,
    bereavement: 5,
};

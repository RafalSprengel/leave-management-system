import type { LeaveRequestType } from "@/constants/leaveTypes";
import type { AbsenceType } from "@/db/models/Absence";

export interface TeamDashboardData {
    totalEmployees: number;
    activeOnLeave: number;
    pendingApprovals: number;
    onLeaveThisWeek: number;
    todayAbsences: PendingRequestItem[];
    upcomingAbsences: PendingRequestItem[];
    pendingRequests: PendingRequestItem[];
}

export interface PendingRequestItem {
    _id: string;
    employee?: string;
    startDate: string;
    endDate: string;
    /** Dni pracujace wniosku - wartosc pochodna, liczona przy odczycie. */
    daysRequested: number;
    type: LeaveRequestType | AbsenceType;
    source: "leave" | "absence";
    employeeName?: string;
    employeeEmail?: string;
    departmentName?: string;
    createdAt: string;
}
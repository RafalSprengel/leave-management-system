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
    departmentOverview: DepartmentOverviewItem[];
}

export interface PendingRequestItem {
    _id: string;
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

export interface DepartmentOverviewItem {
    name: string;
    count: number;
    onLeave: number;
}
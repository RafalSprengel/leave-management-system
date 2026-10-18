"use server";

import dayjs from "dayjs";
import connectDB from "@/db/connection";
import LeaveRequest from "@/db/models/LeaveRequest";
import Employee from "@/db/models/Employee";
import Absence, { type AbsenceType } from "@/db/models/Absence";
import LeaveAllowance from "@/db/models/LeaveAllowance";
import { getOrganizationId } from "@/utils/getOrganizationId";
import { getNonWorkingDays } from "@/utils/nonWorkingDays";
import { computeLeaveDaysRequested, getWorkingDays } from "@/utils/workingDays";
import { countAbsenceOverlapDays, type DateRange } from "@/utils/leaveBalance";
import {
    consumesAllowance,
    type LeaveRequestType,
} from "@/constants/leaveTypes";
import type { SickWeekdayStat } from "@/types/stats";

export interface ReportDataItem {
    _id: string;
    employee?: string;
    startDate: string;
    endDate: string;
    daysRequested: number;
    chargedDays: number;
    status: "pending" | "approved" | "rejected" | "cancelled";
    type: LeaveRequestType;
    employeeName?: string;
    employeeEmail?: string;
    departmentName?: string;
    createdAt: string;
}

export interface AbsenceReportItem {
    _id: string;
    employee?: string;
    startDate: string;
    endDate: string;
    daysRequested: number;
    type: AbsenceType;
    employeeName?: string;
    departmentName?: string;
    createdAt: string;
}

export interface EmployeeReportItem {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentName?: string;
    employmentDate: string;
    status: "active" | "inactive" | "invited";
    role: "Manager" | "Employee";
    annualAllowance: number;
}

export interface ReportData {
    leaveRequests: ReportDataItem[];
    absences: AbsenceReportItem[];
    employees: EmployeeReportItem[];
    sickByWeekday: SickWeekdayStat[];
}

const SICK_WEEKDAY_PERIOD_MONTHS = 12;
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export async function getReportData(): Promise<{
    success: boolean;
    data?: ReportData;
    error?: string;
}> {
    try {
        await connectDB();
        const orgId = await getOrganizationId();

        if (!orgId) {
            return { success: false, error: "Organization ID is missing" };
        }

        const leaveRequests = await LeaveRequest.find({
            organizationId: orgId,
            status: "approved",
        })
            .sort({ createdAt: -1 })
            .lean();

        const absences = await Absence.find({
            organizationId: orgId,
        })
            .sort({ startDate: -1 })
            .lean();

        const employees = await Employee.find({
            organizationId: orgId,
        })
            .populate("department", "name")
            .sort({ firstName: 1 })
            .lean();

        const annualAllowances = await LeaveAllowance.find({
            organizationId: orgId,
            type: "annual",
        }).lean();

        const annualAllowanceByEmployee = new Map(
            annualAllowances.map((a) => [String(a.employee), a.days])
        );

        // daysRequested jest wartoscia pochodna - liczymy z aktualnych dni nieroboczych.
        // Zakres obejmuje zarowno wnioski urlopowe, jak i nieobecnosci (absences),
        // bo oba zrodla sa prezentowane w raportach.
        const rangeItems = [...leaveRequests, ...absences];
        const nonWorkingDates =
            rangeItems.length > 0
                ? await getNonWorkingDays(
                      orgId,
                      rangeItems.reduce(
                          (min, r) => (r.startDate < min ? r.startDate : min),
                          rangeItems[0].startDate
                      ),
                      rangeItems.reduce(
                          (max, r) => (r.endDate > max ? r.endDate : max),
                          rangeItems[0].endDate
                      )
                  )
                : new Set<string>();

        const absencesByEmployee = new Map<string, DateRange[]>();
        for (const a of absences) {
            const key = String(a.employee);
            const list = absencesByEmployee.get(key) ?? [];
            list.push({ startDate: a.startDate, endDate: a.endDate });
            absencesByEmployee.set(key, list);
        }

        const mappedRequests: ReportDataItem[] = leaveRequests.map((lr) => {
            const daysRequested = computeLeaveDaysRequested(
                lr.startDate,
                lr.endDate,
                lr.startHalfDay,
                lr.endHalfDay,
                nonWorkingDates
            );
            const absenceDays = consumesAllowance(lr.type)
                ? countAbsenceOverlapDays(
                      lr,
                      absencesByEmployee.get(String(lr.employee)) ?? [],
                      nonWorkingDates
                  )
                : 0;

            return {
                _id: String(lr._id),
                employee: lr.employee ? String(lr.employee) : undefined,
                startDate: lr.startDate,
                endDate: lr.endDate,
                daysRequested,
                chargedDays: Math.max(daysRequested - absenceDays, 0),
                status: lr.status,
                type: lr.type,
                employeeName: lr.employeeName,
                employeeEmail: lr.employeeEmail,
                departmentName: lr.departmentName,
                createdAt: lr.createdAt ? lr.createdAt.toISOString() : "",
            };
        });

        const mappedAbsences: AbsenceReportItem[] = absences.map((a) => ({
            _id: String(a._id),
            employee: a.employee ? String(a.employee) : undefined,
            startDate: a.startDate,
            endDate: a.endDate,
            daysRequested: computeLeaveDaysRequested(
                a.startDate,
                a.endDate,
                false,
                false,
                nonWorkingDates
            ),
            // Starsze/niekompletne wpisy moga nie miec typu - traktujemy je jako "other".
            type: a.type ?? "other",
            employeeName: a.employeeName,
            departmentName: a.departmentName,
            createdAt: a.createdAt ? a.createdAt.toISOString() : "",
        }));

        const periodStart = dayjs()
            .subtract(SICK_WEEKDAY_PERIOD_MONTHS, "month")
            .format("YYYY-MM-DD");
        const periodEndDay = dayjs();
        const periodEnd = periodEndDay.format("YYYY-MM-DD");

        const sickDaysByWeekday = new Map<number, number>();
        const addSickWorkingDates = (startDate: string, endDate: string) => {
            const from = startDate > periodStart ? startDate : periodStart;
            const to = endDate < periodEnd ? endDate : periodEnd;
            if (from > to) return;
            for (const date of getWorkingDays(from, to, nonWorkingDates)) {
                const weekday = dayjs(date).day();
                if (weekday >= 1 && weekday <= 5) {
                    sickDaysByWeekday.set(weekday, (sickDaysByWeekday.get(weekday) ?? 0) + 1);
                }
            }
        };

        for (const lr of leaveRequests) {
            if (lr.type === "sick") addSickWorkingDates(lr.startDate, lr.endDate);
        }
        for (const a of absences) {
            if ((a.type ?? "other") === "sick") addSickWorkingDates(a.startDate, a.endDate);
        }

        const weekdayOccurrences = new Map<number, number>();
        let cursor = dayjs(periodStart);
        while (!cursor.isAfter(periodEndDay, "day")) {
            const weekday = cursor.day();
            if (weekday >= 1 && weekday <= 5) {
                weekdayOccurrences.set(weekday, (weekdayOccurrences.get(weekday) ?? 0) + 1);
            }
            cursor = cursor.add(1, "day");
        }

        const sickByWeekday: SickWeekdayStat[] = WEEKDAY_LABELS.map((label, index) => {
            const weekday = index + 1;
            const days = sickDaysByWeekday.get(weekday) ?? 0;
            const occurrences = weekdayOccurrences.get(weekday) ?? 0;
            return {
                day: label,
                days,
                occurrences,
                average: occurrences > 0 ? days / occurrences : 0,
            };
        });

        const mappedEmployees: EmployeeReportItem[] = employees.map((emp) => {
            const dept = emp.department as unknown as
                | { _id: string; name: string }
                | undefined;
            return {
                _id: String(emp._id),
                firstName: emp.firstName,
                lastName: emp.lastName,
                email: emp.email,
                departmentName: dept?.name,
                employmentDate: emp.employmentDate
                    ? new Date(emp.employmentDate).toISOString()
                    : "",
                status: emp.status,
                role: emp.role,
                annualAllowance:
                    annualAllowanceByEmployee.get(String(emp._id)) ??
                    emp.holidayAllowance ??
                    0,
            };
        });

        return {
            success: true,
            data: {
                leaveRequests: mappedRequests,
                absences: mappedAbsences,
                employees: mappedEmployees,
                sickByWeekday,
            },
        };
    } catch (error: unknown) {
        console.error("Error fetching report data:", error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to fetch report data",
        };
    }
}
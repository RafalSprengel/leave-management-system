"use server";

import dayjs from "dayjs";
import {
    consumesAllowance,
    type LeaveRequestType,
} from "@/constants/leaveTypes";
import connectDB from "@/db/connection";
import Absence, { type AbsenceType } from "@/db/models/Absence";
import Department from "@/db/models/Department";
import Employee from "@/db/models/Employee";
import LeaveAllowance from "@/db/models/LeaveAllowance";
import LeaveRequest from "@/db/models/LeaveRequest";
import type { SickWeekdayStat } from "@/types/stats";
import { getOrganizationId } from "@/utils/getOrganizationId";
import { countAbsenceOverlapDays, type DateRange } from "@/utils/leaveBalance";
import { getNonWorkingDays } from "@/utils/nonWorkingDays";
import { computeLeaveDaysRequested, getWorkingDays } from "@/utils/workingDays";

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
            .sort({ firstName: 1 })
            .lean();

        const departments = await Department.find({ organization: orgId })
            .select("name managers")
            .lean();

        const annualAllowances = await LeaveAllowance.find({
            organizationId: orgId,
            type: "annual",
        }).lean();

        const annualAllowanceByEmployee = new Map(
            annualAllowances.map((a) => [String(a.employee), a.days])
        );

        const departmentNamesById = new Map<string, string>();
        const managedDepartmentsByEmployee = new Map<string, string[]>();
        for (const department of departments) {
            departmentNamesById.set(String(department._id), department.name);
            for (const managerId of department.managers ?? []) {
                const key = String(managerId);
                const names = managedDepartmentsByEmployee.get(key) ?? [];
                names.push(department.name);
                managedDepartmentsByEmployee.set(key, names);
            }
        }

        const employeeById = new Map(
            employees.map((employee) => [String(employee._id), employee])
        );
        const activeEmployeeIds = new Set(
            employees
                .filter((employee) => employee.status !== "inactive")
                .map((employee) => String(employee._id))
        );

        const getEmployeeDepartmentName = (employeeId: unknown) => {
            if (!employeeId) return undefined;
            const employee = employeeById.get(String(employeeId));
            if (!employee) return undefined;

            const ownDepartmentId = employee.department
                ? String(employee.department)
                : "";
            const ownDepartmentName = ownDepartmentId
                ? departmentNamesById.get(ownDepartmentId)
                : undefined;
            if (ownDepartmentName) return ownDepartmentName;

            const managed = managedDepartmentsByEmployee.get(String(employee._id));
            return managed && managed.length > 0
                ? [...managed].sort((a, b) => a.localeCompare(b)).join(", ")
                : undefined;
        };

        const getEmployeeName = (employeeId: unknown, fallback?: string) => {
            if (!employeeId) return fallback;
            const employee = employeeById.get(String(employeeId));
            return employee
                ? `${employee.firstName} ${employee.lastName}`
                : fallback;
        };

        const activeLeaveRequests = leaveRequests.filter(
            (request) =>
                request.employee && activeEmployeeIds.has(String(request.employee))
        );
        const activeAbsences = absences.filter(
            (absence) =>
                absence.employee && activeEmployeeIds.has(String(absence.employee))
        );

        // daysRequested jest wartoscia pochodna - liczymy z aktualnych dni nieroboczych.
        // Zakres obejmuje zarowno wnioski urlopowe, jak i nieobecnosci (absences),
        // bo oba zrodla sa prezentowane w raportach.
        const rangeItems = [...activeLeaveRequests, ...activeAbsences];
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
        for (const a of activeAbsences) {
            const key = String(a.employee);
            const list = absencesByEmployee.get(key) ?? [];
            list.push({ startDate: a.startDate, endDate: a.endDate });
            absencesByEmployee.set(key, list);
        }

        const mappedRequests: ReportDataItem[] = activeLeaveRequests.map((lr) => {
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
                employeeName: getEmployeeName(lr.employee, lr.employeeName),
                employeeEmail: lr.employeeEmail,
                departmentName:
                    getEmployeeDepartmentName(lr.employee) ?? lr.departmentName,
                createdAt: lr.createdAt ? lr.createdAt.toISOString() : "",
            };
        });

        const mappedAbsences: AbsenceReportItem[] = activeAbsences.map((a) => ({
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
            employeeName: getEmployeeName(a.employee, a.employeeName),
            departmentName:
                getEmployeeDepartmentName(a.employee) ?? a.departmentName,
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

        for (const lr of activeLeaveRequests) {
            if (lr.type === "sick") addSickWorkingDates(lr.startDate, lr.endDate);
        }
        for (const a of activeAbsences) {
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
            return {
                _id: String(emp._id),
                firstName: emp.firstName,
                lastName: emp.lastName,
                email: emp.email,
                departmentName: getEmployeeDepartmentName(emp._id),
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
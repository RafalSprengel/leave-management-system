"use server";

import dayjs from "dayjs";
import dayOfYear from "dayjs/plugin/dayOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import connectDB from "@/db/connection";
import Absence, { type AbsenceType } from "@/db/models/Absence";
import Employee from "@/db/models/Employee";
import LeaveRequest from "@/db/models/LeaveRequest";
import type { PendingRequestItem, TeamDashboardData } from "@/types/dashboard";
import { getOrganizationId } from "@/utils/getOrganizationId";
import { getNonWorkingDays } from "@/utils/nonWorkingDays";
import { computeLeaveDaysRequested } from "@/utils/workingDays";

dayjs.extend(dayOfYear);
dayjs.extend(isoWeek);

export async function getTeamDashboard() {
    try {
        await connectDB();
        const orgId = await getOrganizationId();

        if (!orgId) {
            return { success: false, error: "Organization ID is missing" };
        }

        const today = dayjs();
        const todayStr = today.format("YYYY-MM-DD");
        const startOfWeek = today.startOf("isoWeek");
        const endOfWeek = today.endOf("isoWeek");

        const startOfWeekStr = startOfWeek.format("YYYY-MM-DD");
        const endOfWeekStr = endOfWeek.format("YYYY-MM-DD");
        const tomorrowStr = today.add(1, "day").format("YYYY-MM-DD");

        const [
            totalEmployees,
            pendingApprovals,
            activeEmployeesRaw,
            todayAbsencesRaw,
            todayAbsenceRecordsRaw,
            upcomingAbsencesRaw,
            pendingRequestsRaw,
            weeklyOnLeaveRaw,
        ] = await Promise.all([
            Employee.countDocuments({
                organizationId: orgId,
                status: { $in: ["active", "invited"] },
            }),

            LeaveRequest.countDocuments({
                organizationId: orgId,
                status: "pending",
            }),

            Employee.find({
                organizationId: orgId,
                status: { $in: ["active", "invited"] },
            })
                .select("_id")
                .lean(),

            LeaveRequest.find({
                organizationId: orgId,
                status: "approved",
                startDate: { $lte: todayStr },
                endDate: { $gte: todayStr },
            })
                .sort({ createdAt: -1 })
                .lean(),

            Absence.find({
                organizationId: orgId,
                startDate: { $lte: todayStr },
                endDate: { $gte: todayStr },
            })
                .sort({ createdAt: -1 })
                .lean(),

            LeaveRequest.find({
                organizationId: orgId,
                status: "approved",
                startDate: { $gte: tomorrowStr },
            })
                .sort({ startDate: 1 })
                .limit(10)
                .lean(),

            LeaveRequest.find({
                organizationId: orgId,
                status: "pending",
            })
                .sort({ createdAt: -1 })
                .limit(4)
                .lean(),

            LeaveRequest.aggregate<{ _id: unknown }>([
                {
                    $match: {
                        organizationId: orgId,
                        status: "approved",
                        startDate: { $lte: endOfWeekStr },
                        endDate: { $gte: startOfWeekStr },
                    },
                },
                {
                    $lookup: {
                        from: "employees",
                        localField: "employee",
                        foreignField: "_id",
                        as: "emp",
                    },
                },
                { $unwind: "$emp" },
                {
                    $match: {
                        "emp.status": { $in: ["active", "invited"] },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        employee: "$emp._id",
                    },
                },
                {
                    $unionWith: {
                        coll: "absences",
                        pipeline: [
                            {
                                $match: {
                                    organizationId: orgId,
                                    startDate: { $lte: endOfWeekStr },
                                    endDate: { $gte: startOfWeekStr },
                                },
                            },
                            {
                                $lookup: {
                                    from: "employees",
                                    localField: "employee",
                                    foreignField: "_id",
                                    as: "emp",
                                },
                            },
                            { $unwind: "$emp" },
                            {
                                $match: {
                                    "emp.status": { $in: ["active", "invited"] },
                                },
                            },
                            {
                                $project: {
                                    _id: 0,
                                    employee: "$emp._id",
                                },
                            },
                        ],
                    },
                },
                {
                    $group: {
                        _id: "$employee",
                    },
                },
            ]),
        ]);

        const activeEmployeeIds = new Set(
            activeEmployeesRaw.map((employee) => String(employee._id))
        );

        const activeTodayAbsencesRaw = todayAbsencesRaw.filter(
            (item) => item.employee && activeEmployeeIds.has(String(item.employee))
        );
        const activeTodayAbsenceRecordsRaw = todayAbsenceRecordsRaw.filter(
            (item) => item.employee && activeEmployeeIds.has(String(item.employee))
        );
        const activeUpcomingAbsencesRaw = upcomingAbsencesRaw.filter(
            (item) => item.employee && activeEmployeeIds.has(String(item.employee))
        );

        // daysRequested jest wartoscia pochodna - liczymy dla wszystkich list
        // z aktualnych dni nieroboczych (jeden zakres dla calosci).
        const dashboardDocs = [
            ...activeTodayAbsencesRaw,
            ...activeTodayAbsenceRecordsRaw,
            ...activeUpcomingAbsencesRaw,
            ...pendingRequestsRaw,
        ];

        let dashboardNonWorkingDates: Set<string> = new Set();
        if (dashboardDocs.length > 0) {
            const minStart = dashboardDocs.reduce(
                (min, d) => (d.startDate < min ? d.startDate : min),
                dashboardDocs[0].startDate
            );
            const maxEnd = dashboardDocs.reduce(
                (max, d) => (d.endDate > max ? d.endDate : max),
                dashboardDocs[0].endDate
            );
            dashboardNonWorkingDates = await getNonWorkingDays(orgId, minStart, maxEnd);
        }

        const toPendingItem = (doc: {
            employee?: unknown;
            startDate: string;
            endDate: string;
            startHalfDay?: boolean;
            endHalfDay?: boolean;
        }): PendingRequestItem => {
            const item = JSON.parse(JSON.stringify(doc)) as PendingRequestItem;
            item.employee = doc.employee ? String(doc.employee) : undefined;
            item.daysRequested = computeLeaveDaysRequested(
                doc.startDate,
                doc.endDate,
                doc.startHalfDay ?? false,
                doc.endHalfDay ?? false,
                dashboardNonWorkingDates
            );
            item.source = "leave";
            return item;
        };

        const toAbsenceItem = (doc: {
            _id: unknown;
            employee?: unknown;
            startDate: string;
            endDate: string;
            type?: AbsenceType | null;
            employeeName?: string;
            employeeEmail?: string;
            departmentName?: string;
            createdAt: Date;
        }): PendingRequestItem => ({
            _id: String(doc._id),
            employee: doc.employee ? String(doc.employee) : undefined,
            startDate: doc.startDate,
            endDate: doc.endDate,
            daysRequested: computeLeaveDaysRequested(
                doc.startDate,
                doc.endDate,
                false,
                false,
                dashboardNonWorkingDates
            ),
            type: doc.type ?? "other",
            source: "absence",
            employeeName: doc.employeeName,
            employeeEmail: doc.employeeEmail,
            departmentName: doc.departmentName,
            createdAt: new Date(doc.createdAt).toISOString(),
        });

        const todayAbsences = [
            ...activeTodayAbsencesRaw.map(toPendingItem),
            ...activeTodayAbsenceRecordsRaw.map(toAbsenceItem),
        ]
            .filter((item) => item.employeeName)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        const activeOnLeave = todayAbsences.length;
        const upcomingAbsences = activeUpcomingAbsencesRaw.map(toPendingItem);
        const pendingRequests = pendingRequestsRaw.map(toPendingItem);

        const onLeaveThisWeek = new Set(
            weeklyOnLeaveRaw.map((row) => String(row._id))
        ).size;

        return {
            success: true,
            data: {
                totalEmployees,
                activeOnLeave,
                pendingApprovals,
                onLeaveThisWeek,
                todayAbsences,
                upcomingAbsences,
                pendingRequests,
            } as TeamDashboardData,
        };
    } catch (error: unknown) {
        console.error("Error fetching team dashboard:", error);
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Failed to fetch dashboard data",
        };
    }
}
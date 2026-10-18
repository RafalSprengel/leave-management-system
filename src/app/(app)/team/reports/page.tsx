"use client";

import { useEffect, useState, type ReactNode } from "react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "@mantine/charts/styles.css";
import {
    type MantineColor,
    Center,
    Group,
    Loader,
    Paper,
    SimpleGrid,
    Stack,
    Table,
    Text,
    Title,
} from "@mantine/core";
import { DonutChart, LineChart } from "@mantine/charts";
import {
    IconChartBar,
    IconUsers,
    IconCalendarStats,
    IconReportAnalytics,
    IconStethoscope,
    IconCalendarDue,
} from "@tabler/icons-react";
import { getReportData } from "@/actions/manager/reports/getReportData";
import type {
    ReportDataItem,
    AbsenceReportItem,
    EmployeeReportItem,
} from "@/actions/manager/reports/getReportData";
import SortableHeader from "@/app/(app)/components/SortableHeader/SortableHeader";
import { sortItems, type SortDirection } from "@/utils/sort";

dayjs.extend(isoWeek);

const DEPARTMENT_COLORS: MantineColor[] = [
    "blue.6",
    "teal.6",
    "grape.6",
    "orange.6",
    "cyan.6",
    "pink.6",
    "lime.6",
    "indigo.6",
    "yellow.6",
    "red.6",
];

function monthKey(d: string) { return dayjs(d).format("YYYY-MM"); }
function monthLabel(key: string) { return dayjs(key + "-01").format("MMM YY"); }
function isoWeekKey(d: string) {
    // Uwaga: plugin isoWeek NIE rejestruje tokenow formatu "GGGG"/"WW",
    // dlatego budujemy etykiete z metod isoWeekYear()/isoWeek().
    const dj = dayjs(d);
    return `${dj.isoWeekYear()}-W${String(dj.isoWeek()).padStart(2, "0")}`;
}
function formatTenure(days: number): string {
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    if (years > 0) return `${years}y ${months}m`;
    if (months > 0) return `${months}m ${days % 30}d`;
    return `${days}d`;
}

interface TopEmployee { name: string; days: number; department?: string; }
interface DepartmentSick { department: string; days: number; }
interface EmployeeTenure { _id: string; name: string; departmentName?: string; employmentDate: string; tenureDays: number; }
interface DepartmentTurnover { department: string; active: number; inactive: number; total: number; turnoverRate: number; }
interface SickEntry { key: string; name: string; department?: string; days: number; startDate: string; }

interface ReportColumn<T> {
    key: string;
    label: string;
    align?: "left" | "right";
    getValue: (row: T) => unknown;
    render: (row: T) => ReactNode;
}

function SortableReportTable<T>({
    columns,
    rows,
}: {
    columns: ReportColumn<T>[];
    rows: T[];
}) {
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const handleSort = (key: string) => {
        if (sortColumn === key) {
            setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortColumn(key);
            setSortDirection("asc");
        }
    };

    const sortedRows = sortColumn
        ? sortItems(
              rows,
              (row) => columns.find((c) => c.key === sortColumn)?.getValue(row),
              sortDirection,
          )
        : rows;

    return (
        <Table striped highlightOnHover>
            <Table.Thead>
                <Table.Tr>
                    {columns.map((col) => (
                        <Table.Th key={col.key} ta={col.align === "right" ? "right" : undefined}>
                            <SortableHeader
                                label={col.label}
                                active={sortColumn === col.key}
                                direction={sortDirection}
                                onSort={() => handleSort(col.key)}
                                align={col.align}
                            />
                        </Table.Th>
                    ))}
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {sortedRows.map((row, i) => (
                    <Table.Tr key={i}>
                        {columns.map((col) => (
                            <Table.Td key={col.key} ta={col.align === "right" ? "right" : undefined}>
                                {col.render(row)}
                            </Table.Td>
                        ))}
                    </Table.Tr>
                ))}
            </Table.Tbody>
        </Table>
    );
}

export default function ReportsPage() {
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<ReportDataItem[]>([]);
    const [absences, setAbsences] = useState<AbsenceReportItem[]>([]);
    const [employees, setEmployees] = useState<EmployeeReportItem[]>([]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            const res = await getReportData();
            if (res.success && res.data) {
                setRequests(res.data.leaveRequests);
                setAbsences(res.data.absences);
                setEmployees(res.data.employees);
            }
            setLoading(false);
        })();
    }, []);

    if (loading) {
        return (
            <Center py="xl">
                <Loader />
            </Center>
        );
    }
    // ---- 0. Combined sick leave source ----
    // Sick leave pochodzi z dwoch miejsc: zatwierdzonych wnioskow urlopowych (type "sick")
    // oraz recznie rejestrowanych nieobecnosci (absences type "sick"). Oba zrodla musza
    // trafic do kafelkow dotyczacych zwolnien lekarskich.
    const sickByEmployee = new Map<string, { name: string; days: number; dept?: string }>();
    const sickEntries: SickEntry[] = [];

    const addSickEntry = (key: string, name: string, dept: string | undefined, days: number, startDate: string) => {
        sickEntries.push({ key, name, department: dept, days, startDate });
    };

    for (const r of requests) {
        if (r.type !== "sick") continue;
        addSickEntry(r.employee || r.employeeName || "unknown", r.employeeName || "Unknown", r.departmentName, r.daysRequested, r.startDate);
    }
    for (const a of absences) {
        if (a.type !== "sick") continue;
        addSickEntry(a.employee || a.employeeName || "unknown", a.employeeName || "Unknown", a.departmentName, a.daysRequested, a.startDate);
    }

    // ---- 1. Monthly chart data ----
    const monthlyMap = new Map<string, { sick: number; annual: number; unpaid: number; other: number }>();
    const ensureMonth = (mk: string) => {
        if (!monthlyMap.has(mk)) monthlyMap.set(mk, { sick: 0, annual: 0, unpaid: 0, other: 0 });
        return monthlyMap.get(mk)!;
    };
    for (const r of requests) {
        const m = ensureMonth(monthKey(r.startDate));
        if (r.type === "sick") m.sick += r.daysRequested;
        else if (r.type === "annual") m.annual += r.daysRequested;
        else if (r.type === "unpaid") m.unpaid += r.daysRequested;
        else m.other += r.daysRequested; // bereavement + inne
    }
    // Nieobecnosci (absences) doliczamy do miesiecy wg ich typu.
    for (const a of absences) {
        const m = ensureMonth(monthKey(a.startDate));
        if (a.type === "sick") m.sick += a.daysRequested;
        else m.other += a.daysRequested; // other/unauthorised -> bucket "Other"
    }
    const sortedMonths = Array.from(monthlyMap.keys()).sort();
    const monthlyChartData = sortedMonths.map((mk) => ({
        month: monthLabel(mk),
        "Sick Leave": monthlyMap.get(mk)!.sick,
        "Annual Leave": monthlyMap.get(mk)!.annual,
        Unpaid: monthlyMap.get(mk)!.unpaid,
        Other: monthlyMap.get(mk)!.other,
    }));

    // ---- 2. Weekly sick ----
    const weeklyMap = new Map<string, number>();
    for (const e of sickEntries) {
        const wk = isoWeekKey(e.startDate);
        weeklyMap.set(wk, (weeklyMap.get(wk) || 0) + e.days);
    }
    const topWeeks = Array.from(weeklyMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([week, days]) => ({ week, days }))
        .sort((a, b) => a.week.localeCompare(b.week));

    // ---- 3. Top sick employees ----
    for (const e of sickEntries) {
        if (!sickByEmployee.has(e.key)) sickByEmployee.set(e.key, { name: e.name, days: 0, dept: e.department });
        sickByEmployee.get(e.key)!.days += e.days;
    }
    const topSickEmployees: TopEmployee[] = Array.from(sickByEmployee.values())
        .sort((a, b) => b.days - a.days).slice(0, 10);

    // ---- 4. Top annual employees ----
    const annualByEmployee = new Map<string, { name: string; days: number; dept?: string }>();
    for (const r of requests) {
        if (r.type !== "annual") continue;
        const key = r.employee || r.employeeName || "unknown";
        if (!annualByEmployee.has(key)) annualByEmployee.set(key, { name: r.employeeName || "Unknown", days: 0, dept: r.departmentName });
        annualByEmployee.get(key)!.days += r.daysRequested;
    }
    const topAnnualEmployees: TopEmployee[] = Array.from(annualByEmployee.values())
        .sort((a, b) => b.days - a.days).slice(0, 10);

    // ---- 5. Sick by dept ----
    const sickByDept = new Map<string, number>();
    for (const e of sickEntries) {
        const dept = e.department || "No Department";
        sickByDept.set(dept, (sickByDept.get(dept) || 0) + e.days);
    }
    const deptSickList: DepartmentSick[] = Array.from(sickByDept.entries())
        .map(([department, days]) => ({ department, days }))
        .sort((a, b) => b.days - a.days);
    const deptSickChartData = deptSickList.map((d, index) => ({
        name: d.department,
        value: d.days,
        color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length],
    }));
    // ---- 6. Tenure ----
    const now = dayjs();
    const tenureList: EmployeeTenure[] = employees
        // "Working employees" = aktualnie zatrudnieni (aktywni + zaproszeni, ktorzy
        // dopiero dolaczyli), z pominieciem nieaktywnych (byli pracownicy).
        .filter((e) => e.employmentDate && e.status !== "inactive")
        .map((e) => {
            const start = dayjs(e.employmentDate);
            return {
                _id: e._id,
                name: `${e.firstName} ${e.lastName}`,
                departmentName: e.departmentName,
                employmentDate: e.employmentDate,
                tenureDays: now.diff(start, "day"),
            };
        })
        .sort((a, b) => b.tenureDays - a.tenureDays);
    const longestTenure = tenureList.slice(0, 5);
    const shortestTenure = tenureList.slice(-5).reverse();

    // ---- 7. Turnover ----
    const deptCount = new Map<string, { active: number; inactive: number; total: number }>();
    for (const e of employees) {
        const dept = e.departmentName || "No Department";
        if (!deptCount.has(dept)) deptCount.set(dept, { active: 0, inactive: 0, total: 0 });
        const d = deptCount.get(dept)!;
        d.total++;
        if (e.status === "active") d.active++;
        else if (e.status === "inactive") d.inactive++;
    }
    const turnoverData: DepartmentTurnover[] = Array.from(deptCount.entries())
        .map(([department, counts]) => ({
            department,
            ...counts,
            turnoverRate: counts.total > 0 ? Math.round((counts.inactive / counts.total) * 100) : 0,
        }))
        .sort((a, b) => b.turnoverRate - a.turnoverRate);
    return (
        <Stack gap="xl">
            <Title order={2}>Reports & Analytics</Title>
            {/* Section 1: Monthly chart */}
            <Paper p="md" radius="md" withBorder>
                <Group gap="xs" mb="md">
                    <IconCalendarStats size={22} />
                    <Title order={4}>Leave per Month</Title>
                </Group>
                {monthlyChartData.length === 0 ? (
                    <Text size="sm" c="dimmed">No approved leave data yet.</Text>
                ) : (
                    <LineChart
                        h={350}
                        data={monthlyChartData}
                        dataKey="month"
                        series={[
                            { name: "Sick Leave", color: "red.6" },
                            { name: "Annual Leave", color: "blue.6" },
                            { name: "Unpaid", color: "yellow.6" },
                            { name: "Other", color: "gray.6" },
                        ]}
                        tickLine="y"
                        gridAxis="x"
                        withLegend
                        withTooltip
                        legendProps={{ verticalAlign: "bottom" }}
                        yAxisLabel="Days"
                    />
                )}
            </Paper>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {/* Section 2: Top sick weeks */}
                <Paper p="md" radius="md" withBorder>
                    <Group gap="xs" mb="md">
                        <IconStethoscope size={20} />
                        <Title order={4}>Top 10 Weeks - Sick Leave</Title>
                    </Group>
                    {topWeeks.length === 0 ? (
                        <Text size="sm" c="dimmed">No sick leave data.</Text>
                    ) : (
                        <LineChart
                            h={250}
                            data={topWeeks}
                            dataKey="week"
                            series={[{ name: "days", color: "red.6" }]}
                            tickLine="y"
                            gridAxis="x"
                            withTooltip
                        />
                    )}
                </Paper>

                {/* Section 3: Department sick leave */}
                <Paper p="md" radius="md" withBorder>
                    <Group gap="xs" mb="md">
                        <IconUsers size={20} />
                        <Title order={4}>Sick Leave by Department</Title>
                    </Group>
                    {deptSickList.length === 0 ? (
                        <Text size="sm" c="dimmed">No data.</Text>
                    ) : (
                        <Center>
                            <DonutChart
                                size={200}
                                data={deptSickChartData}
                                withLabels
                                withLabelsLine
                                labelsType="value"
                                withLegend
                            />
                        </Center>
                    )}
                </Paper>
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {/* Section 4: Top employees - Sick */}
                <Paper p="md" radius="md" withBorder>
                    <Group gap="xs" mb="md">
                        <IconChartBar size={20} />
                        <Title order={4}>Most Sick Leave Taken</Title>
                    </Group>
                    {topSickEmployees.length === 0 ? (
                        <Text size="sm" c="dimmed">No data.</Text>
                    ) : (
                        <SortableReportTable
                            rows={topSickEmployees}
                            columns={[
                                { key: "name", label: "Employee", getValue: (e) => e.name, render: (e) => e.name },
                                { key: "department", label: "Department", getValue: (e) => e.department ?? "", render: (e) => e.department || "-" },
                                { key: "days", label: "Days", align: "right", getValue: (e) => e.days, render: (e) => e.days },
                            ]}
                        />
                    )}
                </Paper>

                {/* Section 5: Top employees - Annual */}
                <Paper p="md" radius="md" withBorder>
                    <Group gap="xs" mb="md">
                        <IconCalendarDue size={20} />
                        <Title order={4}>Most Annual Leave Taken</Title>
                    </Group>
                    {topAnnualEmployees.length === 0 ? (
                        <Text size="sm" c="dimmed">No data.</Text>
                    ) : (
                        <SortableReportTable
                            rows={topAnnualEmployees}
                            columns={[
                                { key: "name", label: "Employee", getValue: (e) => e.name, render: (e) => e.name },
                                { key: "department", label: "Department", getValue: (e) => e.department ?? "", render: (e) => e.department || "-" },
                                { key: "days", label: "Days", align: "right", getValue: (e) => e.days, render: (e) => e.days },
                            ]}
                        />
                    )}
                </Paper>
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {/* Section 6: Longest working employees */}
                <Paper p="md" radius="md" withBorder>
                    <Group gap="xs" mb="md">
                        <IconReportAnalytics size={20} />
                        <Title order={4}>Longest Working Employees</Title>
                    </Group>
                    {longestTenure.length === 0 ? (
                        <Text size="sm" c="dimmed">No data.</Text>
                    ) : (
                        <SortableReportTable
                            rows={longestTenure}
                            columns={[
                                { key: "name", label: "Employee", getValue: (e) => e.name, render: (e) => e.name },
                                { key: "department", label: "Department", getValue: (e) => e.departmentName ?? "", render: (e) => e.departmentName || "-" },
                                { key: "tenure", label: "Tenure", align: "right", getValue: (e) => e.tenureDays, render: (e) => formatTenure(e.tenureDays) },
                            ]}
                        />
                    )}
                </Paper>

                {/* Section 7: Shortest working employees */}
                <Paper p="md" radius="md" withBorder>
                    <Group gap="xs" mb="md">
                        <IconReportAnalytics size={20} />
                        <Title order={4}>Shortest Working Employees</Title>
                    </Group>
                    {shortestTenure.length === 0 ? (
                        <Text size="sm" c="dimmed">No data.</Text>
                    ) : (
                        <SortableReportTable
                            rows={shortestTenure}
                            columns={[
                                { key: "name", label: "Employee", getValue: (e) => e.name, render: (e) => e.name },
                                { key: "department", label: "Department", getValue: (e) => e.departmentName ?? "", render: (e) => e.departmentName || "-" },
                                { key: "tenure", label: "Tenure", align: "right", getValue: (e) => e.tenureDays, render: (e) => formatTenure(e.tenureDays) },
                            ]}
                        />
                    )}
                </Paper>
            </SimpleGrid>
            {/* Section 8: Turnover */}
            <Paper p="md" radius="md" withBorder>
                <Group gap="xs" mb="md">
                    <IconUsers size={22} />
                    <Title order={4}>Employee Turnover by Department</Title>
                </Group>
                {turnoverData.length === 0 ? (
                    <Text size="sm" c="dimmed">No data.</Text>
                ) : (
                    <SortableReportTable
                        rows={turnoverData}
                        columns={[
                            { key: "department", label: "Department", getValue: (d) => d.department, render: (d) => d.department },
                            { key: "active", label: "Active", align: "right", getValue: (d) => d.active, render: (d) => d.active },
                            { key: "inactive", label: "Inactive", align: "right", getValue: (d) => d.inactive, render: (d) => d.inactive },
                            { key: "total", label: "Total", align: "right", getValue: (d) => d.total, render: (d) => d.total },
                            { key: "turnoverRate", label: "Turnover Rate", align: "right", getValue: (d) => d.turnoverRate, render: (d) => `${d.turnoverRate}%` },
                        ]}
                    />
                )}
            </Paper>
        </Stack>
    );
}
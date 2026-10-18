"use client";

import { useEffect, useState, type ReactNode } from "react";
import dayjs from "dayjs";
import "@mantine/charts/styles.css";
import {
    type MantineColor,
    Card,
    Center,
    Grid,
    Group,
    Loader,
    Pagination,
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
import type { SickWeekdayStat } from "@/types/stats";
import SortableHeader from "@/app/(app)/components/SortableHeader/SortableHeader";
import { sortItems, type SortDirection } from "@/utils/sort";

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
function formatTenure(days: number): string {
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    if (years > 0) return `${years}y ${months}m`;
    if (months > 0) return `${months}m ${days % 30}d`;
    return `${days}d`;
}

interface TopEmployee { name: string; days: number; department?: string; }
interface AnnualLeftItem {
    _id: string;
    name: string;
    department?: string;
    allowance: number;
    used: number;
    left: number;
}
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
    pageSize,
}: {
    columns: ReportColumn<T>[];
    rows: T[];
    pageSize?: number;
}) {
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [page, setPage] = useState(1);

    const handleSort = (key: string) => {
        setPage(1);
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

    const totalPages = pageSize
        ? Math.max(1, Math.ceil(sortedRows.length / pageSize))
        : 1;
    const activePage = Math.min(page, totalPages);
    const visibleRows = pageSize
        ? sortedRows.slice((activePage - 1) * pageSize, activePage * pageSize)
        : sortedRows;
    const firstVisible = pageSize ? (activePage - 1) * pageSize + 1 : 1;
    const lastVisible = pageSize
        ? Math.min(activePage * pageSize, sortedRows.length)
        : sortedRows.length;
    const placeholderCount = pageSize
        ? Math.max(pageSize - visibleRows.length, 0)
        : 0;
    const placeholderKeys = Array.from(
        { length: placeholderCount },
        (_, i) => `placeholder-${i}`,
    );

    return (
        <Stack gap="sm">
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
                    {visibleRows.map((row, i) => (
                        <Table.Tr key={i}>
                            {columns.map((col) => (
                                <Table.Td key={col.key} ta={col.align === "right" ? "right" : undefined}>
                                    {col.render(row)}
                                </Table.Td>
                            ))}
                        </Table.Tr>
                    ))}
                    {placeholderKeys.map((placeholderKey) => (
                        <Table.Tr key={placeholderKey} style={{ visibility: "hidden" }}>
                            {columns.map((col) => (
                                <Table.Td key={col.key}>
                                    {"\u00A0"}
                                </Table.Td>
                            ))}
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
            {pageSize !== undefined && (
                <Stack gap={8} align="center">
                    <Pagination
                        total={totalPages}
                        value={activePage}
                        onChange={setPage}
                        size="sm"
                        withEdges
                        hideWithOnePage
                    />
                    <Text size="xs" c="dimmed">
                        {firstVisible}–{lastVisible} of {sortedRows.length}
                    </Text>
                </Stack>
            )}
        </Stack>
    );
}

export default function ReportsPage() {
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<ReportDataItem[]>([]);
    const [absences, setAbsences] = useState<AbsenceReportItem[]>([]);
    const [employees, setEmployees] = useState<EmployeeReportItem[]>([]);
    const [sickByWeekday, setSickByWeekday] = useState<SickWeekdayStat[]>([]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            const res = await getReportData();
            if (res.success && res.data) {
                setRequests(res.data.leaveRequests);
                setAbsences(res.data.absences);
                setEmployees(res.data.employees);
                setSickByWeekday(res.data.sickByWeekday ?? []);
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

    // ---- 2. Sick by weekday (last 12 months, computed on the server) ----
    const hasSickWeekdayData = sickByWeekday.some((d) => d.days > 0);

    // ---- 3. Top sick employees ----
    for (const e of sickEntries) {
        if (!sickByEmployee.has(e.key)) sickByEmployee.set(e.key, { name: e.name, days: 0, dept: e.department });
        sickByEmployee.get(e.key)!.days += e.days;
    }
    const topSickEmployees: TopEmployee[] = Array.from(sickByEmployee.values())
        .sort((a, b) => b.days - a.days).slice(0, 10);

    // ---- 4. Annual left to take ----
    const annualUsedByEmployee = new Map<string, number>();
    for (const r of requests) {
        if (r.type !== "annual" || !r.employee) continue;
        const charged = r.chargedDays ?? r.daysRequested ?? 0;
        annualUsedByEmployee.set(
            r.employee,
            (annualUsedByEmployee.get(r.employee) ?? 0) + charged,
        );
    }
    const annualLeftList: AnnualLeftItem[] = employees
        .filter((e) => e.status !== "inactive")
        .map((e) => {
            const used = annualUsedByEmployee.get(e._id) ?? 0;
            const allowance = e.annualAllowance ?? 0;
            return {
                _id: e._id,
                name: `${e.firstName} ${e.lastName}`,
                department: e.departmentName,
                allowance,
                used,
                left: allowance - used,
            };
        })
        .sort((a, b) => b.left - a.left);

    const totalAnnualAllowance = annualLeftList.reduce((sum, e) => sum + e.allowance, 0);
    const totalAnnualUsed = annualLeftList.reduce((sum, e) => sum + e.used, 0);
    const totalAnnualLeft = Math.max(totalAnnualAllowance - totalAnnualUsed, 0);
    const hasAnnualBalanceData = totalAnnualAllowance > 0 || totalAnnualUsed > 0;
    const annualTakenPercent =
        totalAnnualUsed + totalAnnualLeft > 0
            ? Math.round((totalAnnualUsed / (totalAnnualUsed + totalAnnualLeft)) * 100)
            : 0;
    const annualBalanceChartData = [
        { name: "Taken", value: totalAnnualUsed, color: "yellow.6" },
        { name: "Remaining", value: totalAnnualLeft, color: "gray.8" },
    ];

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
            <Grid gap="lg">
                {/* Section 1: Monthly chart */}
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <Paper p="md" radius="md" withBorder h="100%">
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
                </Grid.Col>

                {/* Annual leave: taken vs allowance */}
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <Card
                        shadow="sm"
                        padding="lg"
                        radius="md"
                        withBorder
                        h="100%"
                        style={{ display: "flex", flexDirection: "column" }}
                    >
                        <Text fw={500} size="lg" mb="md">
                            Annual Leave Taken
                        </Text>
                        {!hasAnnualBalanceData ? (
                            <Text size="sm" c="dimmed">No annual allowance data.</Text>
                        ) : (
                            <Stack justify="center" style={{ flex: 1 }}>
                                <Center>
                                    <DonutChart
                                        data={annualBalanceChartData}
                                        startAngle={180}
                                        endAngle={0}
                                        size={220}
                                        thickness={24}
                                        chartLabel={`${annualTakenPercent}%`}
                                        withTooltip={false}
                                        styles={{ label: { fontSize: "1.75rem" } }}
                                    />
                                </Center>
                                <Stack mt={-80} gap="xs">
                                    <Group justify="space-between">
                                        <Group gap="xs">
                                            <div
                                                style={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: 2,
                                                    backgroundColor: "var(--mantine-color-yellow-6)",
                                                }}
                                            />
                                            <Text size="sm">Taken</Text>
                                        </Group>
                                        <Text size="sm" fw={500}>
                                            {totalAnnualUsed}
                                        </Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Group gap="xs">
                                            <div
                                                style={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: 2,
                                                    backgroundColor: "var(--mantine-color-gray-8)",
                                                }}
                                            />
                                            <Text size="sm">Remaining</Text>
                                        </Group>
                                        <Text size="sm" fw={500}>
                                            {totalAnnualLeft}
                                        </Text>
                                    </Group>
                                </Stack>
                            </Stack>
                        )}
                    </Card>
                </Grid.Col>
            </Grid>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {/* Section 2: Sick leave by weekday */}
                <Paper p="md" radius="md" withBorder>
                    <Group gap="xs" mb="xs">
                        <IconStethoscope size={20} />
                        <Title order={4}>Sick Leave by Weekday</Title>
                    </Group>
                    <Text size="xs" c="dimmed" mb="md">
                        Average sick days per weekday over the last 12 months.
                    </Text>
                    {!hasSickWeekdayData ? (
                        <Text size="sm" c="dimmed">No sick leave data in the last 12 months.</Text>
                    ) : (
                        <LineChart
                            h={250}
                            data={sickByWeekday}
                            dataKey="day"
                            series={[{ name: "average", label: "Avg sick days", color: "red.6" }]}
                            tickLine="y"
                            gridAxis="x"
                            withTooltip
                            withDots
                            valueFormatter={(value) => value.toFixed(1)}
                            yAxisLabel="Avg days"
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

                {/* Section 5: Most annual left to take */}
                <Paper p="md" radius="md" withBorder>
                    <Group gap="xs" mb="md">
                        <IconCalendarDue size={20} />
                        <Title order={4}>Most Annual Left to Take</Title>
                    </Group>
                    {annualLeftList.length === 0 ? (
                        <Text size="sm" c="dimmed">No data.</Text>
                    ) : (
                        <SortableReportTable
                            rows={annualLeftList}
                            pageSize={10}
                            columns={[
                                { key: "name", label: "Employee", getValue: (e) => e.name, render: (e) => e.name },
                                { key: "department", label: "Department", getValue: (e) => e.department ?? "", render: (e) => e.department || "-" },
                                { key: "allowance", label: "Allowance", align: "right", getValue: (e) => e.allowance, render: (e) => e.allowance },
                                { key: "used", label: "Taken", align: "right", getValue: (e) => e.used, render: (e) => e.used },
                                { key: "left", label: "Left", align: "right", getValue: (e) => e.left, render: (e) => e.left },
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
"use client";

import dayjs from "dayjs";
import { type ReactNode, useEffect, useState } from "react";
import "@mantine/charts/styles.css";
import { AreaChart, DonutChart } from "@mantine/charts";
import {
  Avatar,
  Badge,
  Box,
  Card,
  Center,
  Flex,
  Group,
  Loader,
  type MantineColor,
  Pagination,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconCalendarDue,
  IconCalendarStats,
  IconChartBar,
  IconReportAnalytics,
  IconStethoscope,
  IconUsers,
} from "@tabler/icons-react";
import type {
  AbsenceReportItem,
  EmployeeReportItem,
  ReportDataItem,
} from "@/actions/manager/reports/getReportData";
import { getReportData } from "@/actions/manager/reports/getReportData";
import SortableHeader from "@/app/(app)/components/SortableHeader/SortableHeader";
import type { SickWeekdayStat } from "@/types/stats";
import { type SortDirection, sortItems } from "@/utils/sort";
import styles from "./page.module.css";

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

function monthKey(d: string) {
  return dayjs(d).format("YYYY-MM");
}
function monthLabel(key: string) {
  return dayjs(key + "-01").format("MMM YY");
}
function formatTenure(days: number): string {
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years > 0) return `${years}y ${months}m`;
  if (months > 0) return `${months}m ${days % 30}d`;
  return `${days}d`;
}

const AVATAR_COLORS: MantineColor[] = [
  "blue",
  "teal",
  "grape",
  "orange",
  "cyan",
  "pink",
  "lime",
  "indigo",
];

function avatarColor(name: string): MantineColor {
  const hash = Array.from(name).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function EmployeeName({ name }: { name: string }) {
  return (
    <Group gap="sm" wrap="nowrap">
      <Avatar size="sm" radius="xl" variant="light" color={avatarColor(name)}>
        {initials(name)}
      </Avatar>
      <Text size="sm" fw={500} lineClamp={1}>
        {name}
      </Text>
    </Group>
  );
}

function MetricCard({
  label,
  value,
  badge,
  description,
  icon,
  color,
}: {
  label: string;
  value: string;
  badge: string;
  description?: string;
  icon: ReactNode;
  color: MantineColor;
}) {
  return (
    <Card p={{ base: "sm", sm: "lg" }} radius="md" withBorder h="100%">
      <Flex direction="column" gap="xs" h="100%">
        <Group
          justify="space-between"
          align="flex-start"
          wrap="nowrap"
          gap="xs"
          mih={{ base: 32, sm: 38 }}
        >
          <Text
            fz={{ base: 10, sm: 12 }}
            c="dimmed"
            fw={700}
            tt="uppercase"
            style={{ letterSpacing: "0.05em", minWidth: 0 }}
          >
            {label}
          </Text>
          <ThemeIcon
            variant="light"
            color={color}
            radius="md"
            size="md"
            style={{ flexShrink: 0 }}
          >
            {icon}
          </ThemeIcon>
        </Group>
        <Stack gap="xs">
          <Text fw={700} lineClamp={1} fz={{ base: 22, sm: 28 }} lh={1.15}>
            {value}
          </Text>
          <Group gap="xs" wrap="wrap">
            <Badge variant="light" color={color} size="sm">
              {badge}
            </Badge>
            {description && (
              <Text size="xs" c="dimmed" lineClamp={2}>
                {description}
              </Text>
            )}
          </Group>
        </Stack>
      </Flex>
    </Card>
  );
}

interface TopEmployee {
  name: string;
  days: number;
  department?: string;
}
interface AnnualLeftItem {
  _id: string;
  name: string;
  department?: string;
  allowance: number;
  used: number;
  left: number;
}
interface DepartmentSick {
  department: string;
  days: number;
}
interface EmployeeTenure {
  _id: string;
  name: string;
  departmentName?: string;
  employmentDate: string;
  tenureDays: number;
}
interface SickEntry {
  key: string;
  name: string;
  department?: string;
  days: number;
  startDate: string;
}

interface ReportColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  hideNarrow?: boolean;
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
      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            {columns.map((col) => (
              <Table.Th
                key={col.key}
                ta={col.align === "right" ? "right" : undefined}
                className={col.hideNarrow ? styles.hideNarrow : undefined}
                c="dimmed"
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
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
                <Table.Td
                  key={col.key}
                  ta={col.align === "right" ? "right" : undefined}
                  className={col.hideNarrow ? styles.hideNarrow : undefined}
                >
                  {col.render(row)}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
          {placeholderKeys.map((placeholderKey) => (
            <Table.Tr key={placeholderKey} style={{ visibility: "hidden" }}>
              {columns.map((col) => (
                <Table.Td
                  key={col.key}
                  className={col.hideNarrow ? styles.hideNarrow : undefined}
                >
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
  const sickByEmployee = new Map<
    string,
    { name: string; days: number; dept?: string }
  >();
  const sickEntries: SickEntry[] = [];

  const addSickEntry = (
    key: string,
    name: string,
    dept: string | undefined,
    days: number,
    startDate: string,
  ) => {
    sickEntries.push({ key, name, department: dept, days, startDate });
  };

  for (const r of requests) {
    if (r.type !== "sick") continue;
    addSickEntry(
      r.employee || r.employeeName || "unknown",
      r.employeeName || "Unknown",
      r.departmentName,
      r.daysRequested,
      r.startDate,
    );
  }
  for (const a of absences) {
    if (a.type !== "sick") continue;
    addSickEntry(
      a.employee || a.employeeName || "unknown",
      a.employeeName || "Unknown",
      a.departmentName,
      a.daysRequested,
      a.startDate,
    );
  }

  // ---- 1. Monthly chart data ----
  const monthlyMap = new Map<
    string,
    { sick: number; annual: number; unpaid: number; other: number }
  >();
  const ensureMonth = (mk: string) => {
    if (!monthlyMap.has(mk))
      monthlyMap.set(mk, { sick: 0, annual: 0, unpaid: 0, other: 0 });
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
    if (!sickByEmployee.has(e.key))
      sickByEmployee.set(e.key, { name: e.name, days: 0, dept: e.department });
    sickByEmployee.get(e.key)!.days += e.days;
  }
  const topSickEmployees: TopEmployee[] = Array.from(sickByEmployee.values())
    .sort((a, b) => b.days - a.days)
    .slice(0, 10);

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

  const totalAnnualAllowance = annualLeftList.reduce(
    (sum, e) => sum + e.allowance,
    0,
  );
  const totalAnnualUsed = annualLeftList.reduce((sum, e) => sum + e.used, 0);
  const totalAnnualLeft = Math.max(totalAnnualAllowance - totalAnnualUsed, 0);
  const hasAnnualBalanceData = totalAnnualAllowance > 0 || totalAnnualUsed > 0;
  const annualTakenPercent =
    totalAnnualUsed + totalAnnualLeft > 0
      ? Math.round(
          (totalAnnualUsed / (totalAnnualUsed + totalAnnualLeft)) * 100,
        )
      : 0;

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

  // ---- 5b. Summary metrics ----
  const totalSickDays = sickEntries.reduce((sum, e) => sum + e.days, 0);
  const totalAbsenceDays =
    requests.reduce((sum, r) => sum + r.daysRequested, 0) +
    absences.reduce((sum, a) => sum + a.daysRequested, 0);
  const sickLeaveRate =
    totalAbsenceDays > 0
      ? Math.round((totalSickDays / totalAbsenceDays) * 100)
      : 0;
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

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
        <div>
          <Title order={2}>Reports & Analytics</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Leave, absence and workforce insights at a glance.
          </Text>
        </div>
        <Badge
          variant="light"
          color="blue"
          size="lg"
          leftSection={<IconCalendarStats size={14} />}
        >
          {monthlyChartData.length} months tracked
        </Badge>
      </Group>

      <SimpleGrid cols={2} spacing={{ base: "sm", sm: "lg" }}>
        <MetricCard
          label="Annual leave used"
          value={`${annualTakenPercent}%`}
          badge={`${totalAnnualLeft} days left`}
          description={
            hasAnnualBalanceData
              ? `${totalAnnualUsed} of ${totalAnnualAllowance} days used`
              : "No allowance data"
          }
          icon={<IconCalendarDue size={20} />}
          color="yellow"
        />
        <MetricCard
          label="Sick leave rate"
          value={`${sickLeaveRate}%`}
          badge={`${totalSickDays} sick days`}
          description="of all absence days"
          icon={<IconStethoscope size={20} />}
          color="red"
        />
      </SimpleGrid>

      {/* Section 1: Monthly chart */}
      <Paper p="lg" radius="md" withBorder h="100%">
        <Group justify="space-between" align="flex-start" mb="md">
          <div>
            <Group gap="xs">
              <IconCalendarStats size={22} />
              <Title order={4}>Leave per Month</Title>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              Absence days by leave type across tracked months.
            </Text>
          </div>
          <Badge variant="light" color="blue">
            Monthly
          </Badge>
        </Group>
        {monthlyChartData.length === 0 ? (
          <Text size="sm" c="dimmed">
            No approved leave data yet.
          </Text>
        ) : (
          <AreaChart
            h={350}
            data={monthlyChartData}
            dataKey="month"
            series={[
              { name: "Sick Leave", color: "red.6" },
              { name: "Annual Leave", color: "blue.6" },
              { name: "Unpaid", color: "yellow.6" },
              { name: "Other", color: "gray.6" },
            ]}
            curveType="monotone"
            withGradient
            fillOpacity={0.15}
            strokeWidth={2}
            dotProps={{ r: 2.5, strokeWidth: 1 }}
            activeDotProps={{ r: 5, strokeWidth: 0 }}
            tickLine="y"
            gridAxis="x"
            gridColor="gray.2"
            strokeDasharray="3 3"
            withLegend
            withTooltip
            legendProps={{ verticalAlign: "bottom" }}
            yAxisLabel="Days"
          />
        )}
      </Paper>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* Section 2: Sick leave by weekday */}
        <Paper p="lg" radius="md" withBorder h="100%">
          <Group gap="xs" mb="xs">
            <IconStethoscope size={20} />
            <Title order={4}>Sick Leave by Weekday</Title>
          </Group>
          <Text size="xs" c="dimmed" mb="md">
            Sick days per weekday over the last 12 months.
          </Text>
          {!hasSickWeekdayData ? (
            <Text size="sm" c="dimmed">
              No sick leave data in the last 12 months.
            </Text>
          ) : (
            <AreaChart
              h={250}
              data={sickByWeekday}
              dataKey="day"
              series={[{ name: "days", label: "Sick days", color: "red.6" }]}
              curveType="monotone"
              withGradient
              fillOpacity={0.15}
              strokeWidth={2}
              dotProps={{ r: 3, strokeWidth: 1 }}
              activeDotProps={{ r: 5, strokeWidth: 0 }}
              tickLine="y"
              gridAxis="x"
              gridColor="gray.2"
              strokeDasharray="3 3"
              withTooltip
              yAxisProps={{ allowDecimals: false }}
              yAxisLabel="Days"
            />
          )}
        </Paper>

        {/* Section 3: Department sick leave */}
        <Paper p="lg" radius="md" withBorder h="100%">
          <Group gap="xs" mb="md">
            <IconUsers size={20} />
            <Title order={4}>Sick Leave by Department</Title>
          </Group>
          <Text size="xs" c="dimmed" mb="md">
            Distribution of sick days across departments.
          </Text>
          {deptSickList.length === 0 ? (
            <Text size="sm" c="dimmed">
              No data.
            </Text>
          ) : (
            <Box
              style={{
                position: "relative",
                width: "fit-content",
                margin: "0 auto",
              }}
            >
              <DonutChart
                size={220}
                data={deptSickChartData}
                withLabels
                withLabelsLine
                labelsType="value"
                withLegend
                style={{ position: "relative", zIndex: 1 }}
              />
              <Stack
                gap={2}
                align="center"
                justify="center"
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                }}
              >
                <Text fw={700} fz="1.5rem" lh={1}>
                  {totalSickDays}
                </Text>
                <Text
                  size="xs"
                  c="dimmed"
                  fw={600}
                  tt="uppercase"
                  style={{ letterSpacing: "0.05em" }}
                >
                  Total
                </Text>
              </Stack>
            </Box>
          )}
        </Paper>
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1 }} spacing="lg">
        {/* Section 4: Most annual left to take */}
        <Paper p="lg" radius="md" withBorder h="100%">
          <Group gap="xs" mb="md">
            <IconCalendarDue size={20} />
            <Title order={4}>Most Annual Left to Take</Title>
          </Group>
          {annualLeftList.length === 0 ? (
            <Text size="sm" c="dimmed">
              No data.
            </Text>
          ) : (
            <SortableReportTable
              rows={annualLeftList}
              pageSize={10}
              columns={[
                {
                  key: "name",
                  label: "Employee",
                  getValue: (e) => e.name,
                  render: (e) => <EmployeeName name={e.name} />,
                },
                {
                  key: "department",
                  label: "Department",
                  getValue: (e) => e.department ?? "",
                  render: (e) => e.department || "-",
                },
                {
                  key: "allowance",
                  label: "Allowance",
                  align: "right",
                  hideNarrow: true,
                  getValue: (e) => e.allowance,
                  render: (e) => e.allowance,
                },
                {
                  key: "used",
                  label: "Taken",
                  align: "right",
                  hideNarrow: true,
                  getValue: (e) => e.used,
                  render: (e) => (
                    <Badge variant="light" color="yellow" size="sm">
                      {e.used}
                    </Badge>
                  ),
                },
                {
                  key: "left",
                  label: "Left",
                  align: "right",
                  getValue: (e) => e.left,
                  render: (e) => (
                    <Badge
                      variant="light"
                      color={e.left > 0 ? "blue" : "gray"}
                      size="sm"
                    >
                      {e.left}
                    </Badge>
                  ),
                },
              ]}
            />
          )}
        </Paper>
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* Section 5: Longest/shortest working employees */}
        <Paper p="lg" radius="md" withBorder h="100%">
          <Group gap="xs" mb="md">
            <IconReportAnalytics size={20} />
            <Title order={4}>Longest/Shortest Working Employees</Title>
          </Group>
          {tenureList.length === 0 ? (
            <Text size="sm" c="dimmed">
              No data.
            </Text>
          ) : (
            <SortableReportTable
              rows={tenureList}
              pageSize={5}
              columns={[
                {
                  key: "name",
                  label: "Employee",
                  getValue: (e) => e.name,
                  render: (e) => <EmployeeName name={e.name} />,
                },
                {
                  key: "department",
                  label: "Department",
                  getValue: (e) => e.departmentName ?? "",
                  render: (e) => e.departmentName || "-",
                },
                {
                  key: "tenure",
                  label: "Tenure",
                  align: "right",
                  getValue: (e) => e.tenureDays,
                  render: (e) => formatTenure(e.tenureDays),
                },
              ]}
            />
          )}
        </Paper>

        {/* Section 6: Top employees - Sick */}
        <Paper p="lg" radius="md" withBorder h="100%">
          <Group gap="xs" mb="md">
            <IconChartBar size={20} />
            <Title order={4}>Most Sick Leave Taken</Title>
          </Group>
          {topSickEmployees.length === 0 ? (
            <Text size="sm" c="dimmed">
              No data.
            </Text>
          ) : (
            <SortableReportTable
              rows={topSickEmployees}
              columns={[
                {
                  key: "name",
                  label: "Employee",
                  getValue: (e) => e.name,
                  render: (e) => <EmployeeName name={e.name} />,
                },
                {
                  key: "department",
                  label: "Department",
                  getValue: (e) => e.department ?? "",
                  render: (e) => e.department || "-",
                },
                {
                  key: "days",
                  label: "Days",
                  align: "right",
                  getValue: (e) => e.days,
                  render: (e) => (
                    <Badge variant="light" color="red" size="sm">
                      {e.days}
                    </Badge>
                  ),
                },
              ]}
            />
          )}
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}

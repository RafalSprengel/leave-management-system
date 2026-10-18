"use client";

import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Group,
  Loader,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCalendarPlus,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconPlaneDeparture,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useEmployees } from "@/hooks/useEmployees";
import { useMyLeaveRequests } from "@/hooks/useMyLeaveRequests";
import { useTeamLeaveRequests } from "@/hooks/useTeamLeaveRequests";
import { sumAnnualDaysUsed } from "@/utils/leaveBalance";
import { LEAVE_REQUEST_TYPES, getLeaveTypeLabel } from "@/constants/leaveTypes";
import { getMySickDaysThisYear } from "@/actions/employee/absences/getMySickDaysThisYear";
import { getAbsences } from "@/actions/admin/absences/getAbsences";
import type { IAbsenceItem } from "@/types/absence";
import SortableHeader from "@/app/(app)/components/SortableHeader/SortableHeader";
import { sortItems, type SortDirection } from "@/utils/sort";

dayjs.extend(relativeTime);

type SortColumn = "type" | "dates" | "days" | "status" | "submitted";

// Labels for recorded absence types (see Absence model). Reuses the wording
// from the /team/absences page so the two views stay consistent.
const ABSENCE_TYPE_LABELS: Record<string, string> = {
  sick: "Sick Leave",
  unauthorised: "Unauthorised",
  other: "Other",
};

export default function EmployeeDashboard() {
  const router = useRouter();
  const { employee, loading } = useCurrentEmployee();
  const { requests, loading: requestsLoading } = useMyLeaveRequests();
  const { employees, loading: loadingEmployees } = useEmployees();
  const { requests: teamRequests, loading: loadingTeamRequests } =
    useTeamLeaveRequests();

  const [sickDaysThisYear, setSickDaysThisYear] = useState(0);
  const [absences, setAbsences] = useState<IAbsenceItem[]>([]);
  const [absencesLoading, setAbsencesLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await getMySickDaysThisYear();
      if (res.success) {
        setSickDaysThisYear(res.days);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const res = await getAbsences();
      if (res.success) {
        setAbsences(res.data);
      }
      setAbsencesLoading(false);
    })();
  }, []);

  const typeLabels: Record<string, string> = Object.fromEntries(
    LEAVE_REQUEST_TYPES.map((t) => [t, getLeaveTypeLabel(t)]),
  );

  const recentRequests = requests.slice(0, 2).map((req) => ({
    id: req._id,
    type: typeLabels[req.type] ?? req.type,
    startDate: req.startDate,
    dates: `${dayjs(req.startDate).format("DD-MM-YYYY")} → ${dayjs(req.endDate).format("DD-MM-YYYY")}`,
    days: req.daysRequested,
    status: req.status,
    createdAt: req.createdAt,
    submitted: dayjs(req.createdAt).fromNow(),
  }));

  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  const sortedRecentRequests = sortColumn
    ? sortItems(
        recentRequests,
        (req) => {
          switch (sortColumn) {
            case "type":
              return req.type;
            case "dates":
              return dayjs(req.startDate).valueOf();
            case "days":
              return req.days;
            case "status":
              return req.status;
            case "submitted":
              return dayjs(req.createdAt).valueOf();
          }
        },
        sortDirection,
      )
    : recentRequests;

  // Koledzy z mojego dzialu (bez mnie), ktorzy sa offline w ciagu najbliszych 7 dni.
  // Laczymy zatwierdzone wnioski urlopowe ORAZ zarejestrowane nieobecnosci
  // (np. sick leave), zeby w tym miejscu bylo widac wszystkie typy nieobecnosci.
  const colleaguesOff = useMemo(() => {
    if (!employee) return [];

    const myDeptId =
      typeof employee.department === "object"
        ? employee.department?._id
        : employee.department;

    if (!myDeptId) return [];

    const colleagueIds = new Set(
      employees
        .filter((emp) => emp._id !== employee._id)
        .filter((emp) => {
          const deptId =
            typeof emp.department === "object"
              ? emp.department?._id
              : emp.department;
          return deptId === myDeptId;
        })
        .map((emp) => emp._id),
    );

    // Only show entries that overlap the next 7 days (from today).
    const windowStart = dayjs().startOf("day");
    const windowEnd = dayjs().startOf("day").add(7, "day");

    const overlapsWindow = (startDate: string, endDate: string) => {
      const start = dayjs(startDate).startOf("day");
      const end = dayjs(endDate).startOf("day");
      return !start.isAfter(windowEnd) && !end.isBefore(windowStart);
    };

    const fromLeave = teamRequests
      .filter(
        (req) =>
          req.status === "approved" &&
          !!req.employee &&
          colleagueIds.has(req.employee) &&
          overlapsWindow(req.startDate, req.endDate),
      )
      .map((req) => ({
        id: req._id,
        employeeName: req.employeeName,
        typeLabel: getLeaveTypeLabel(req.type),
        startDate: req.startDate,
        endDate: req.endDate,
      }));

    const fromAbsences = absences
      .filter(
        (a) =>
          colleagueIds.has(a.employee) &&
          overlapsWindow(a.startDate, a.endDate),
      )
      .map((a) => ({
        id: a.id,
        employeeName: a.employeeName,
        typeLabel: ABSENCE_TYPE_LABELS[a.type] ?? a.type,
        startDate: a.startDate,
        endDate: a.endDate,
      }));

    return [...fromLeave, ...fromAbsences].sort(
      (a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf(),
    );
  }, [employee, employees, teamRequests, absences]);

  if (
    loading ||
    requestsLoading ||
    loadingEmployees ||
    loadingTeamRequests ||
    absencesLoading
  ) {
    return (
      <Flex justify="center" align="center" py={80}>
        <Loader />
      </Flex>
    );
  }

  const holidayAllowance = employee?.holidayAllowance ?? 0;

  // Only approved annual leave counts as used allowance; days covered by an
  // absence (sick etc.) are not deducted.
  const annualDaysUsed = sumAnnualDaysUsed(requests);
  const daysLeft = holidayAllowance - annualDaysUsed;
  const usagePercent =
    holidayAllowance > 0
      ? Math.min((annualDaysUsed / holidayAllowance) * 100, 100)
      : 0;
  const remainingPercent = Math.max(100 - usagePercent, 0);
  const remainingDays = Math.max(daysLeft, 0);
  const hasAnnualData = holidayAllowance > 0 || annualDaysUsed > 0;

  // Stats for leave requests still awaiting approval.
  const pendingRequests = requests.filter((req) => req.status === "pending");
  const pendingCount = pendingRequests.length;
  const pendingDays = pendingRequests.reduce(
    (sum, req) => sum + req.daysRequested,
    0,
  );

  return (
    <Stack gap="lg">
      <Paper
        p="lg"
        radius="md"
        withBorder
        style={{ background: "var(--mantine-color-blue-0)" }}
      >
        <Group justify="space-between" align="center" wrap="wrap">
          <Box>
            <Title order={2} size="h3">
              Welcome back, {employee?.firstName ?? "there"}.
            </Title>
            <Text size="sm" c="dimmed" mt={4}>
              Here is your leave summary and upcoming team availability.
            </Text>
          </Box>
          <Button
            component={Link}
            href="/me/leave-requests/new"
            size="md"
            leftSection={<IconCalendarPlus size={18} />}
          >
            Request Time Off
          </Button>
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 2, md: 3 }} spacing="xs">
        <Paper p="sm" radius="md" withBorder>
          <Group justify="space-between" align="center" wrap="nowrap" mb="xs">
            <Text size="xs" c="dimmed" fw={600} style={{ textTransform: "uppercase" }}>
              Annual Leave
            </Text>
            <ThemeIcon variant="light" color="yellow" size="sm" style={{ flexShrink: 0 }}>
              <IconPlaneDeparture size={14} />
            </ThemeIcon>
          </Group>
          {hasAnnualData ? (
            <Stack gap={6}>
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Text size="xs" fw={500}>
                  {annualDaysUsed} days taken
                </Text>
                <Text size="xs" c="dimmed">
                  {remainingDays} left of {holidayAllowance}
                </Text>
              </Group>
              <Progress.Root radius="xl" size={16}>
                <Progress.Section value={usagePercent} color="yellow.6" />
                <Progress.Section value={remainingPercent} color="gray.8" />
              </Progress.Root>
            </Stack>
          ) : (
            <Text size="xs" c="dimmed">
              No annual allowance data.
            </Text>
          )}
        </Paper>

        <Paper p="sm" radius="md" withBorder>
          <Group justify="space-between" align="center" wrap="nowrap" mb={4}>
            <Text size="xs" c="dimmed" fw={600} style={{ textTransform: "uppercase" }}>
              Sick Leave Used
            </Text>
            <ThemeIcon variant="light" color="red" size="sm" style={{ flexShrink: 0 }}>
              <IconAlertCircle size={14} />
            </ThemeIcon>
          </Group>
          <Group align="baseline" gap="xs">
            <Text size="lg" fw={700} lh={1}>
              {sickDaysThisYear}
            </Text>
            <Text size="xs" c="dimmed">
              days this year
            </Text>
          </Group>
        </Paper>

        <Paper p="sm" radius="md" withBorder>
          <Group justify="space-between" align="center" wrap="nowrap" mb={4}>
            <Text size="xs" c="dimmed" fw={600} style={{ textTransform: "uppercase" }}>
              Pending Approval
            </Text>
            <ThemeIcon variant="light" color="orange" size="sm" style={{ flexShrink: 0 }}>
              <IconClock size={14} />
            </ThemeIcon>
          </Group>
          <Group align="baseline" gap="xs">
            <Text size="lg" fw={700} lh={1}>
              {pendingCount}
            </Text>
            <Text size="xs" c="dimmed">
              {pendingCount} {pendingCount === 1 ? "request" : "requests"} ·{" "}
              {pendingDays} {pendingDays === 1 ? "day" : "days"}
            </Text>
          </Group>
        </Paper>
      </SimpleGrid>

      <Grid gap="md">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Paper p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Box>
                <Title order={3} size="h4">
                  My Recent Requests
                </Title>
                <Text size="sm" c="dimmed">
                  Track status of your submitted time-off requests
                </Text>
              </Box>
              <Button
                component={Link}
                href="/me/leave-requests"
                variant="subtle"
                size="xs"
                rightSection={<IconChevronRight size={14} />}
              >
                View all
              </Button>
            </Group>

            <Box visibleFrom="sm">
              <Table.ScrollContainer minWidth={500}>
                <Table verticalSpacing="sm" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>
                        <SortableHeader label="Type" active={sortColumn === "type"} direction={sortDirection} onSort={() => handleSort("type")} />
                      </Table.Th>
                      <Table.Th>
                        <SortableHeader label="Dates" active={sortColumn === "dates"} direction={sortDirection} onSort={() => handleSort("dates")} />
                      </Table.Th>
                      <Table.Th>
                        <SortableHeader label="Days" active={sortColumn === "days"} direction={sortDirection} onSort={() => handleSort("days")} />
                      </Table.Th>
                      <Table.Th>
                        <SortableHeader label="Status" active={sortColumn === "status"} direction={sortDirection} onSort={() => handleSort("status")} />
                      </Table.Th>
                      <Table.Th>
                        <SortableHeader label="Submitted" active={sortColumn === "submitted"} direction={sortDirection} onSort={() => handleSort("submitted")} />
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sortedRecentRequests.map((req) => (
                      <Table.Tr
                        key={req.id}
                        onClick={() =>
                          router.push(`/me/leave-requests/${req.id}`)
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {req.type}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {req.id}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{req.dates}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{req.days}d</Text>
                        </Table.Td>
                        <Table.Td>
                          <StatusBadge status={req.status} />
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {req.submitted}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Box>

            <Stack gap="md" hiddenFrom="sm">
              {recentRequests.length === 0 && (
                <Text size="sm" c="dimmed" ta="center">
                  No leave requests found.
                </Text>
              )}
              {sortedRecentRequests.map((req) => (
                <Paper
                  key={req.id}
                  p="sm"
                  radius="md"
                  withBorder
                  onClick={() => router.push(`/me/leave-requests/${req.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <Group justify="space-between" align="center" mb="xs">
                    <Text fw={600} size="md">
                      {req.type}
                    </Text>
                    <StatusBadge status={req.status} />
                  </Group>
                  <Group justify="space-between" gap="xs">
                    <Text size="sm" c="dimmed" flex="0 0 auto">
                      Dates
                    </Text>
                    <Text size="sm">{req.dates}</Text>
                  </Group>
                  <Group justify="space-between" gap="xs">
                    <Text size="sm" c="dimmed" flex="0 0 auto">
                      Days
                    </Text>
                    <Text size="sm">{req.days}d</Text>
                  </Group>
                  <Group justify="space-between" gap="xs">
                    <Text size="sm" c="dimmed" flex="0 0 auto">
                      Submitted
                    </Text>
                    <Text size="xs" c="dimmed">
                      {req.submitted}
                    </Text>
                  </Group>
                </Paper>
              ))}
            </Stack>

            {recentRequests.length > 0 && (
              <Group justify="center" mt="md">
                <Button
                  component={Link}
                  href="/me/leave-requests"
                  variant="subtle"
                  size="xs"
                  rightSection={<IconChevronRight size={14} />}
                >
                  More...
                </Button>
              </Group>
            )}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Paper p="lg" radius="md" withBorder style={{ height: "100%" }}>
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <ThemeIcon variant="light" color="indigo" radius="md">
                  <IconUsers size={18} />
                </ThemeIcon>
                <Title order={3} size="h4">
                  Team Absences
                </Title>
              </Group>
            </Group>

            <Text size="xs" c="dimmed" mb="lg">
              Leave and other absences for team members in your department over
              the next 7 days.
            </Text>

            <Stack gap="md">
              {colleaguesOff.length === 0 && (
                <Text size="sm" c="dimmed">
                  No one from your team is off in the next 7 days.
                </Text>
              )}

              {colleaguesOff.map((req) => (
                <Paper
                  key={req.id}
                  p="xs"
                  radius="sm"
                  withBorder
                  bg="var(--mantine-color-gray-0)"
                >
                  <Group justify="space-between" align="center">
                    <Box>
                      <Text size="sm" fw={500}>
                        {req.employeeName || "Team member"}
                      </Text>
                      <Text size="xs" c="dimmed" tt="capitalize">
                        {req.typeLabel}
                      </Text>
                    </Box>
                    <Badge variant="outline" color="gray" size="sm">
                      {dayjs(req.startDate).format("DD-MM-YYYY")} →{" "}
                      {dayjs(req.endDate).format("DD-MM-YYYY")}
                    </Badge>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <Badge
          color="green"
          variant="light"
          leftSection={<IconCheck size={12} />}
        >
          Approved
        </Badge>
      );
    case "pending":
      return (
        <Badge
          color="orange"
          variant="light"
          leftSection={<IconClock size={12} />}
        >
          Pending
        </Badge>
      );
    case "rejected":
      return (
        <Badge color="red" variant="light" leftSection={<IconX size={12} />}>
          Rejected
        </Badge>
      );
    default:
      return <Badge color="gray">{status}</Badge>;
  }
}

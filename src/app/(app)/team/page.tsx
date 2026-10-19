// src/app/(app)/team/page.tsx
'use client';

import {
    Text,
    Title,
    Button,
    Badge,
    Group,
    Stack,
    SimpleGrid,
    Grid,
    ThemeIcon,
    Box,
    Paper,
    Table,
    ActionIcon,
    Tooltip,
    Avatar,
    Menu,
    Loader,
    Flex,
    TextInput,
} from "@mantine/core"
import {
    IconUsers,
    IconClock,
    IconCheck,
    IconX,
    IconDotsVertical,
    IconCalendarStats,
    IconUserPlus,
    IconSettings,
    IconChevronRight,
    IconCalendar,
    IconCalendarPlus,
} from "@tabler/icons-react"
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import Link from "next/link"
import { useTeamDashboard } from "@/hooks/useTeamDashboard"
import { formatRequestDays } from "@/utils/leaveBalance"
import { LEAVE_REQUEST_TYPES, getLeaveTypeLabel } from "@/constants/leaveTypes"
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    approveLeaveRequestAsAdmin,
    rejectLeaveRequestAsAdmin,
} from "@/actions/admin/leave/reviewLeaveRequest";
import type { PendingRequestItem } from "@/types/dashboard";

dayjs.extend(relativeTime)

const typeLabels: Record<string, string> = Object.fromEntries(
    LEAVE_REQUEST_TYPES.map((t) => [t, getLeaveTypeLabel(t)]),
)

const absenceTypeLabels: Record<string, string> = {
    sick: "Sick Leave",
    unauthorised: "Unauthorised",
    other: "Other",
}

const absenceTypeColors: Record<string, string> = {
    sick: "orange",
    unauthorised: "red",
    other: "gray",
}

function formatDateRange(startDate: string, endDate: string): string {
    const start = dayjs(startDate, "YYYY-MM-DD")
    const end = dayjs(endDate, "YYYY-MM-DD")
    return `${start.format("DD-MM-YYYY")} → ${end.format("DD-MM-YYYY")}`
}

export default function AdminDashboard() {
    const router = useRouter();
    const { data, loading, refetch } = useTeamDashboard()
    const [hoveredAbsenceId, setHoveredAbsenceId] = useState<string | null>(null);
    const rejectReasonRef = useRef("");

    const handleApprove = (req: PendingRequestItem) => {
        modals.openConfirmModal({
            title: "Approve Leave Request",
            children: (
                <Text size="sm">
                    Are you sure you want to approve this holiday request&nbsp;for{" "}
                    {req.employeeName || "this employee"}?
                </Text>
            ),
            labels: { confirm: "Approve", cancel: "Cancel" },
            confirmProps: { color: "green" },
            onConfirm: async () => {
                const result = await approveLeaveRequestAsAdmin(req._id);

                if (result.success) {
                    notifications.show({
                        title: "Approved",
                        message: `Leave request for ${req.employeeName || "employee"} has been approved.`,
                        color: "green",
                        icon: <IconCheck size={16} />,
                    });
                    await refetch();
                } else {
                    notifications.show({
                        title: "Error",
                        message: result.error || "Failed to approve leave request",
                        color: "red",
                        icon: <IconX size={16} />,
                    });
                }
            },
        });
    };

    const handleReject = (req: PendingRequestItem) => {
        rejectReasonRef.current = "";
        modals.openConfirmModal({
            title: "Reject Leave Request",
            children: (
                <>
                    <Text size="sm">
                        Are you sure you want to reject this holiday request&nbsp;for{" "}
                        {req.employeeName || "this employee"}? This action cannot be undone.
                    </Text>
                    <TextInput
                        label="Rejection Reason"
                        description="Optional reason shown to the employee"
                        placeholder="Why are you rejecting this request?"
                        onChange={(e) => {
                            rejectReasonRef.current = e.currentTarget.value;
                        }}
                        mt="sm"
                    />
                </>
            ),
            labels: { confirm: "Reject", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: async () => {
                const result = await rejectLeaveRequestAsAdmin(
                    req._id,
                    rejectReasonRef.current,
                );

                if (result.success) {
                    notifications.show({
                        title: "Rejected",
                        message: `Leave request for ${req.employeeName || "employee"} has been rejected.`,
                        color: "red",
                        icon: <IconX size={16} />,
                    });
                    await refetch();
                } else {
                    notifications.show({
                        title: "Error",
                        message: result.error || "Failed to reject leave request",
                        color: "red",
                        icon: <IconX size={16} />,
                    });
                }
            },
        });
    };

    if (loading) {
        return (
            <Flex justify="center" align="center" py={80}>
                <Loader />
            </Flex>
        )
    }

    if (!data) {
        return (
            <Text ta="center" py={80} c="dimmed">
                Failed to load dashboard data
            </Text>
        )
    }

    const todayAbsences = data.todayAbsences || []
    const upcomingAbsences = data.upcomingAbsences || []
    const pendingRequests = data.pendingRequests || []

    // Filter out requests that have no employeeName (e.g. orphaned records)
    const validPendingRequests = pendingRequests.filter((req) => req.employeeName)
    const validTodayAbsences = todayAbsences.filter((req) => req.employeeName)
    const validUpcomingAbsences = upcomingAbsences.filter((req) => req.employeeName)

    const todaySickCount = validTodayAbsences.filter((absence) => absence.type === "sick").length
    const todayLeaveCount = validTodayAbsences.length - todaySickCount

    const departmentAbsences = new Map<string, Set<string>>()
    for (const absence of validTodayAbsences) {
        const department = absence.departmentName || "No Department"
        const employeeKey = absence.employee || absence.employeeEmail || absence._id
        const employeeKeys = departmentAbsences.get(department) ?? new Set<string>()
        employeeKeys.add(employeeKey)
        departmentAbsences.set(department, employeeKeys)
    }
    const absencesByDepartment = Array.from(
        departmentAbsences,
        ([name, employeeKeys]) => ({ name, absent: employeeKeys.size }),
    ).sort((a, b) => b.absent - a.absent || a.name.localeCompare(b.name))

    return (
        <Stack gap="lg">
            <Paper p="lg" radius="md" withBorder style={{ background: "var(--mantine-color-dark-8)", color: "var(--mantine-color-white)" , display: 'none'}} > //temporary hidden
                <Group justify="space-between" align="center" wrap="wrap" >
                    <Box>
                        <Title order={2} size="h3" style={{ color: "var(--mantine-color-white)" }}>
                            Admin & HR Overview ⚙️
                        </Title>
                        <Text size="sm" c="dimmed" mt={4}>
                            Manage company-wide leaves, employee allowances, and system configurations.
                        </Text>
                    </Box>
                    <Group gap="xs">
                        <Button
                            component={Link}
                            href="/team/employees"
                            variant="light"
                            color="blue"
                            size="sm"
                            leftSection={<IconUserPlus size={16} />}
                        >
                            Add Employee
                        </Button>
                        <Button
                            component={Link}
                            href="/team/settings"
                            variant="default"
                            size="sm"
                            leftSection={<IconSettings size={16} />}
                        >
                            Settings
                        </Button>
                    </Group>
                </Group>
            </Paper>

            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="xs">
                <Paper p="sm" radius="md" withBorder h="100%">
                    <Flex direction="column" gap="xs" h="100%">
                        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs" mih={38}>
                            <Text size="xs" c="dimmed" fw={600} style={{ textTransform: "uppercase" }}>
                                Total Employees
                            </Text>
                            <ThemeIcon variant="light" color="blue" size="sm" style={{ flexShrink: 0 }}>
                                <IconUsers size={14} />
                            </ThemeIcon>
                        </Group>
                        <Group align="baseline" gap="xs">
                            <Text size="lg" fw={700} lh={1}>
                                {data.totalEmployees}
                            </Text>
                        </Group>
                    </Flex>
                </Paper>

                <Paper p="sm" radius="md" withBorder h="100%">
                    <Flex direction="column" gap="xs" h="100%">
                        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs" mih={38}>
                            <Text size="xs" c="dimmed" fw={600} style={{ textTransform: "uppercase" }}>
                                Currently Off Today
                            </Text>
                            <ThemeIcon variant="light" color="teal" size="sm" style={{ flexShrink: 0 }}>
                                <IconCalendarStats size={14} />
                            </ThemeIcon>
                        </Group>
                        <Group align="baseline" gap="xs">
                            <Text size="lg" fw={700} lh={1}>
                                {validTodayAbsences.length}
                            </Text>
                            <Text size="xs" c="dimmed">
                                • {todayLeaveCount} Leave · {todaySickCount} Sick
                            </Text>
                        </Group>
                    </Flex>
                </Paper>

                <Paper p="sm" radius="md" withBorder h="100%">
                    <Flex direction="column" gap="xs" h="100%">
                        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs" mih={38}>
                            <Text size="xs" c="dimmed" fw={600} style={{ textTransform: "uppercase" }}>
                                Pending Requests
                            </Text>
                            <ThemeIcon variant="light" color="orange" size="sm" style={{ flexShrink: 0 }}>
                                <IconClock size={14} />
                            </ThemeIcon>
                        </Group>
                        <Group align="baseline" gap="xs">
                            <Text size="lg" fw={700} lh={1}>
                                {data.pendingApprovals}
                            </Text>
                            <Text size="xs" c="dimmed">
                                • Action required
                            </Text>
                        </Group>
                    </Flex>
                </Paper>

                <Paper p="sm" radius="md" withBorder h="100%">
                    <Flex direction="column" gap="xs" h="100%">
                        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs" mih={38}>
                            <Text size="xs" c="dimmed" fw={600} style={{ textTransform: "uppercase" }}>
                                On Leave This Week
                            </Text>
                            <ThemeIcon variant="light" color="red" size="sm" style={{ flexShrink: 0 }}>
                                <IconCalendarStats size={14} />
                            </ThemeIcon>
                        </Group>
                        <Group align="baseline" gap="xs">
                            <Text size="lg" fw={700} lh={1}>
                                {data.onLeaveThisWeek}
                            </Text>
                            <Text size="xs" c="dimmed">
                                • Approved
                            </Text>
                        </Group>
                    </Flex>
                </Paper>
            </SimpleGrid>

            <Grid gap="md">
                <Grid.Col span={{ base: 12, lg: 8 }}>
                    <Paper
                        p={validPendingRequests.length === 0 ? "sm" : "lg"}
                        radius="md"
                        withBorder
                    >
                        <Group
                            justify="space-between"
                            mb={validPendingRequests.length === 0 ? 0 : "md"}
                        >
                            <Box>
                                <Title order={3} size="h4">
                                    Latest Pending Leave Requests
                                </Title>
                                <Text size="sm" c="dimmed">
                                    Review and override company-wide time off requests
                                </Text>
                            </Box>
                            {validPendingRequests.length > 0 && (
                                <Button
                                    component={Link}
                                    href="/team/leave-requests"
                                    variant="subtle"
                                    size="xs"
                                    rightSection={<IconChevronRight size={14} />}
                                >
                                    View All ({data.pendingApprovals})
                                </Button>
                            )}
                        </Group>

                        {validPendingRequests.length === 0 ? (
                            <Text ta="center" py="md" c="dimmed">
                                No pending leave requests
                            </Text>
                        ) : (
                            <Table.ScrollContainer minWidth={600}>
                                <Table verticalSpacing="sm" highlightOnHover>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Employee</Table.Th>
                                            <Table.Th>Type</Table.Th>
                                            <Table.Th>Dates</Table.Th>
                                            <Table.Th>Days</Table.Th>
                                            <Table.Th>Actions</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {validPendingRequests.map((req) => {
                                            const fullName = req.employeeName || "Employee has been deleted";
                                            const deptName = req.departmentName || "No Department";

                                            return (
                                                <Table.Tr
                                                    key={req._id}
                                                    onClick={() => router.push(`/team/leave-requests/${req._id}`)}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <Table.Td>
                                                        <Group gap="sm" wrap="nowrap">
                                                            <Avatar
                                                                name={fullName}
                                                                radius="xl"
                                                                size="sm"
                                                                color="initials"
                                                            />
                                                            <Box>
                                                                <Text size="sm" fw={500}>
                                                                    {fullName}
                                                                </Text>
                                                                <Text size="xs" c="dimmed">
                                                                    {deptName}
                                                                </Text>
                                                            </Box>
                                                        </Group>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge variant="light" color="blue" size="sm">
                                                            {typeLabels[req.type] ?? req.type}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="sm">{formatDateRange(req.startDate, req.endDate)}</Text>
                                                        <Text size="xs" c="dimmed">
                                                            Submitted {dayjs(req.createdAt).fromNow()}
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="sm" fw={500}>
                                                            {formatRequestDays(req, "d")}
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
                                                            <Tooltip label="Approve">
                                                                <ActionIcon
                                                                    variant="light"
                                                                    color="green"
                                                                    radius="xl"
                                                                    onClick={() => handleApprove(req)}
                                                                >
                                                                    <IconCheck size={16} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                            <Tooltip label="Reject">
                                                                <ActionIcon
                                                                    variant="light"
                                                                    color="red"
                                                                    radius="xl"
                                                                    onClick={() => handleReject(req)}
                                                                >
                                                                    <IconX size={16} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                            <Menu position="bottom-end" shadow="md">
                                                                <Menu.Target>
                                                                    <ActionIcon variant="subtle" color="gray" radius="xl">
                                                                        <IconDotsVertical size={16} />
                                                                    </ActionIcon>
                                                                </Menu.Target>
                                                                <Menu.Dropdown>
                                                                    <Menu.Item
                                                                        component={Link}
                                                                        href={`/team/leave-requests/${req._id}`}
                                                                    >
                                                                        View Details
                                                                    </Menu.Item>
                                                                    <Menu.Item
                                                                        color="blue"
                                                                        component={Link}
                                                                        href={`/team/employees/${req.employee}/profile`}
                                                                    >
                                                                        Employee Profile
                                                                    </Menu.Item>
                                                                </Menu.Dropdown>
                                                            </Menu>
                                                        </Group>
                                                    </Table.Td>
                                                </Table.Tr>
                                            );
                                        })}
                                    </Table.Tbody>
                                </Table>
                            </Table.ScrollContainer>
                        )}
                    </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, lg: 4 }}>
                    <Paper p="lg" radius="md" withBorder style={{ height: "100%" }}>
                        <Group justify="space-between" align="center" mb="md">
                            <Title order={3} size="h4">
                                Today&apos;s Absences by Department
                            </Title>
                        </Group>

                        {absencesByDepartment.length === 0 ? (
                            <Text ta="center" py="xl" c="dimmed" size="sm">
                                No absences today
                            </Text>
                        ) : (
                            <Table verticalSpacing="xs" horizontalSpacing="sm">
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Department</Table.Th>
                                        <Table.Th ta="right">Absent</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {absencesByDepartment.map((department) => (
                                        <Table.Tr key={department.name}>
                                            <Table.Td>
                                                <Text size="sm" fw={500}>
                                                    {department.name}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td ta="right">
                                                <Badge variant="light" color="blue">
                                                    {department.absent}
                                                </Badge>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        )}
                    </Paper>
                </Grid.Col>
            </Grid>

            <Paper p="lg" radius="md" withBorder>
                <Group justify="space-between" align="center" mb="md">
                    <Group gap="xs" align="center">
                        <IconCalendar size={22} />
                        <Title order={3} size="h4" fw={700}>
                            Absences Today
                        </Title>
                    </Group>
                    <Badge variant="light" color="blue" size="lg" leftSection={<IconUsers size={14} />}>
                        {validTodayAbsences.length} ABSENCES
                    </Badge>
                </Group>

                {validTodayAbsences.length === 0 ? (
                    <Text ta="center" py="xl" c="dimmed">
                        No absences for today
                    </Text>
                ) : (
                    <Stack gap="sm">
                        {validTodayAbsences.map((absence) => {
                            const fullName = absence.employeeName || "Employee has been deleted";
                            const deptName = absence.departmentName || "No Department";
                            const typeLabel = absence.source === "absence"
                                ? absenceTypeLabels[absence.type] ?? absence.type
                                : typeLabels[absence.type] ?? absence.type;
                            const absenceHref = absence.source === "absence"
                                ? "/team/absences"
                                : `/team/leave-requests/${absence._id}`;

                            return (
                                <Paper
                                    key={`${absence.source}-${absence._id}`}
                                    p="md"
                                    radius="md"
                                    onClick={() => router.push(absenceHref)}
                                    onMouseEnter={() => setHoveredAbsenceId(absence._id)}
                                    onMouseLeave={() => setHoveredAbsenceId(null)}
                                    style={{
                                        border: "1px solid var(--mantine-color-gray-3)",
                                        backgroundColor:
                                            hoveredAbsenceId === absence._id
                                                ? "var(--mantine-color-gray-1)"
                                                : "var(--mantine-color-gray-0)",
                                        cursor: "pointer",
                                        transition: "background-color 100ms ease",
                                    }}
                                >
                                    <Group justify="space-between" align="center">
                                        <Group gap="md">
                                            <Avatar
                                                name={fullName}
                                                radius="xl"
                                                size="md"
                                                color="blue"
                                                variant="light"
                                            />
                                            <Box>
                                                <Text size="sm" fw={700}>
                                                    {fullName}
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    {deptName} • {typeLabel}
                                                </Text>
                                            </Box>
                                        </Group>

                                        <Group gap="md">
                                            <Text size="sm" fw={600} c="dimmed">
                                                {dayjs(absence.startDate).format("DD-MM-YYYY")} → {dayjs(absence.endDate).format("DD-MM-YYYY")}
                                            </Text>
                                            {absence.source === "absence" ? (
                                                <Badge
                                                    color={absenceTypeColors[absence.type] ?? "gray"}
                                                    variant="light"
                                                    size="lg"
                                                    radius="xl"
                                                >
                                                    {absenceTypeLabels[absence.type] ?? absence.type}
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    color="green"
                                                    variant="outline"
                                                    size="lg"
                                                    radius="xl"
                                                    leftSection={<Box style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--mantine-color-green-6)" }} />}
                                                >
                                                    APPROVED
                                                </Badge>
                                            )}
                                        </Group>
                                    </Group>
                                </Paper>
                            );
                        })}
                    </Stack>
                )}
            </Paper>

            <Paper p="lg" radius="md" withBorder>
                <Group justify="space-between" align="center" mb="md">
                    <Group gap="xs" align="center">
                        <IconCalendarPlus size={22} />
                        <Title order={3} size="h4" fw={700}>
                            Upcoming Absences
                        </Title>
                    </Group>
                    <Badge variant="light" color="violet" size="lg" leftSection={<IconUsers size={14} />}>
                        {validUpcomingAbsences.length} UPCOMING
                    </Badge>
                </Group>

                {validUpcomingAbsences.length === 0 ? (
                    <Text ta="center" py="xl" c="dimmed">
                        No upcoming absences
                    </Text>
                ) : (
                    <Stack gap="sm">
                        {validUpcomingAbsences.map((absence) => {
                            const fullName = absence.employeeName || "Employee has been deleted";
                            const deptName = absence.departmentName || "No Department";

                            return (
                                <Paper
                                    key={absence._id}
                                    p="md"
                                    radius="md"
                                    onClick={() => router.push(`/team/leave-requests/${absence._id}`)}
                                    onMouseEnter={() => setHoveredAbsenceId(absence._id)}
                                    onMouseLeave={() => setHoveredAbsenceId(null)}
                                    style={{
                                        border: "1px solid var(--mantine-color-gray-3)",
                                        backgroundColor:
                                            hoveredAbsenceId === absence._id
                                                ? "var(--mantine-color-gray-1)"
                                                : "var(--mantine-color-gray-0)",
                                        cursor: "pointer",
                                        transition: "background-color 100ms ease",
                                    }}
                                >
                                    <Group justify="space-between" align="center">
                                        <Group gap="md">
                                            <Avatar
                                                name={fullName}
                                                radius="xl"
                                                size="md"
                                                color="blue"
                                                variant="light"
                                            />
                                            <Box>
                                                <Text size="sm" fw={700}>
                                                    {fullName}
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    {deptName} • {typeLabels[absence.type] ?? absence.type}
                                                </Text>
                                            </Box>
                                        </Group>

                                        <Group gap="md">
                                            <Text size="sm" fw={600} c="dimmed">
                                                {dayjs(absence.startDate).format("DD-MM-YYYY")} → {dayjs(absence.endDate).format("DD-MM-YYYY")}
                                            </Text>
                                            <Badge
                                                color="green"
                                                variant="outline"
                                                size="lg"
                                                radius="xl"
                                                leftSection={<Box style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--mantine-color-green-6)" }} />}
                                            >
                                                APPROVED
                                            </Badge>
                                        </Group>
                                    </Group>
                                </Paper>
                            );
                        })}
                    </Stack>
                )}
            </Paper>
        </Stack>
    )
}
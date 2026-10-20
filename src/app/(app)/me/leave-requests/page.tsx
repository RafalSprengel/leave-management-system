"use client";

import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Divider,
    Group,
    Pagination,
    Paper,
    Select,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
    Tooltip,
} from "@mantine/core";
import {
    IconPlus,
    IconSearch,
    IconSortAscending,
    IconSortDescending,
} from "@tabler/icons-react";
import Link from "next/link";
import { useMyLeaveRequests } from "@/hooks/useMyLeaveRequests";
import { useRouter } from "next/navigation";
import { formatRequestDays } from "@/utils/leaveBalance";
import { LEAVE_REQUEST_TYPES, getLeaveTypeLabel } from "@/constants/leaveTypes";
import dayjs from "dayjs";
import { useState } from "react";
import SortableHeader from "@/app/(app)/components/SortableHeader/SortableHeader";
import { sortItems, type SortDirection } from "@/utils/sort";

const typeLabels: Record<string, string> = Object.fromEntries(
    LEAVE_REQUEST_TYPES.map((t) => [t, getLeaveTypeLabel(t)]),
);

type SortColumn = "type" | "dates" | "days" | "status" | "comment";

const PAGE_SIZE = 10;

export default function EmployeeLeaveRequestsPage() {
    const router = useRouter();
    const { requests } = useMyLeaveRequests();
    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [sortDirection, setSortDirection] = useState<"newest" | "oldest">("newest");
    const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
    const [columnDirection, setColumnDirection] = useState<SortDirection>("asc");

    function handleSort(column: SortColumn) {
        setPage(1);
        if (sortColumn === column) {
            setColumnDirection((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortColumn(column);
            setColumnDirection("asc");
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return <Badge color="green">Approved</Badge>;
            case "pending":
                return <Badge color="yellow">Pending</Badge>;
            case "rejected":
                return <Badge color="red">Rejected</Badge>;
            case "cancelled":
                return <Badge color="gray">Cancelled</Badge>;
            default:
                return <Badge color="gray">{status}</Badge>;
        }
    };

    const filteredRequests = requests.filter((r) => {
        if (statusFilter !== "All" && r.status !== statusFilter.toLowerCase()) {
            return false;
        }

        const query = search.trim().toLowerCase();
        if (!query) return true;

        return (
            (typeLabels[r.type] ?? r.type).toLowerCase().includes(query) ||
            r.status.toLowerCase().includes(query) ||
            (r.comment ?? "").toLowerCase().includes(query)
        );
    });

    const displayRequests = sortColumn
        ? sortItems(
              filteredRequests,
              (req) => {
                  switch (sortColumn) {
                      case "type":
                          return typeLabels[req.type] ?? req.type;
                      case "dates":
                          return dayjs(req.startDate).valueOf();
                      case "days":
                          return req.daysRequested;
                      case "status":
                          return req.status;
                      case "comment":
                          return req.comment ?? "";
                  }
              },
              columnDirection,
          )
        : [...filteredRequests].sort((a, b) => {
              const delta =
                  dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf();
              return sortDirection === "newest" ? delta : -delta;
          });

    const today = dayjs().startOf("day");
    const isPast = (item: { endDate: string }) =>
        dayjs(item.endDate).startOf("day").isBefore(today);

    const totalPages = Math.max(1, Math.ceil(displayRequests.length / PAGE_SIZE));
    const activePage = Math.min(page, totalPages);
    const visibleRequests = displayRequests.slice(
        (activePage - 1) * PAGE_SIZE,
        activePage * PAGE_SIZE,
    );
    const firstVisible = (activePage - 1) * PAGE_SIZE + 1;
    const lastVisible = Math.min(activePage * PAGE_SIZE, displayRequests.length);

    const currentRequests = visibleRequests.filter((r) => !isPast(r));
    const pastRequests = visibleRequests.filter((r) => isPast(r));

    const emptyMessage = search.trim()
        ? "No requests match your search."
        : "No leave requests found.";

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="center">
                <Title order={2}>My Leave Requests</Title>
                <Button leftSection={<IconPlus size={18} />} component={Link} href="/me/leave-requests/new">
                    New Request
                </Button>
            </Group>

            <Paper
                p="md"
                radius="md"
                withBorder
                bg="var(--mantine-color-body)"
                style={{ overflowX: "auto" }}
            >
                <Group justify="space-between" mb="md">
                    <Title order={4}>Request History</Title>
                    <Group gap="xs" wrap="wrap">
                        <TextInput
                            placeholder="Search requests…"
                            leftSection={<IconSearch size={16} />}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.currentTarget.value);
                                setPage(1);
                            }}
                            w={220}
                        />
                        <Select
                            value={statusFilter}
                            onChange={(val) => {
                                setStatusFilter(val ?? "All");
                                setPage(1);
                            }}
                            data={["All", "Pending", "Approved", "Rejected", "Cancelled"]}
                            w={160}
                        />
                        <Tooltip
                            label={
                                sortDirection === "newest"
                                    ? "Newest first — click for oldest first"
                                    : "Oldest first — click for newest first"
                            }
                        >
                            <ActionIcon
                                variant={
                                    sortDirection === "newest" ? "light" : "subtle"
                                }
                                color="blue"
                                radius="xl"
                                onClick={() => {
                                    setSortColumn(null);
                                    setPage(1);
                                    setSortDirection(
                                        sortDirection === "newest" ? "oldest" : "newest",
                                    );
                                }}
                            >
                                {sortDirection === "newest" ? (
                                    <IconSortDescending size={16} />
                                ) : (
                                    <IconSortAscending size={16} />
                                )}
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>
                <Box visibleFrom="sm">
                    <Table highlightOnHover verticalSpacing="sm">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>
                                    <SortableHeader label="Type" active={sortColumn === "type"} direction={columnDirection} onSort={() => handleSort("type")} />
                                </Table.Th>
                                <Table.Th>
                                    <SortableHeader label="Dates" active={sortColumn === "dates"} direction={columnDirection} onSort={() => handleSort("dates")} />
                                </Table.Th>
                                <Table.Th>
                                    <SortableHeader label="Days" active={sortColumn === "days"} direction={columnDirection} onSort={() => handleSort("days")} />
                                </Table.Th>
                                <Table.Th>
                                    <SortableHeader label="Status" active={sortColumn === "status"} direction={columnDirection} onSort={() => handleSort("status")} />
                                </Table.Th>
                                <Table.Th>
                                    <SortableHeader label="Comment" active={sortColumn === "comment"} direction={columnDirection} onSort={() => handleSort("comment")} />
                                </Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {currentRequests.map((item) => (
                                <Table.Tr key={item._id} onClick={() => router.push(`/me/leave-requests/${item._id}`)}
                                    style={{ cursor: "pointer" }}>
                                    <Table.Td>{typeLabels[item.type] ?? item.type}</Table.Td>
                                    <Table.Td>
                                        {dayjs(item.startDate).format("DD-MM-YYYY")} → {dayjs(item.endDate).format("DD-MM-YYYY")}
                                    </Table.Td>
                                    <Table.Td>{formatRequestDays(item)}</Table.Td>
                                    <Table.Td>{getStatusBadge(item.status)}</Table.Td>
                                    <Table.Td>
                                        <Text size="sm" c="dimmed" lineClamp={1}>
                                            {item.comment || "—"}
                                        </Text>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                            {pastRequests.length > 0 && (
                                <>
                                    <Table.Tr>
                                        <Table.Td colSpan={5}>
                                            <Divider label="Past Leaves" labelPosition="center" my="xs" />
                                        </Table.Td>
                                    </Table.Tr>
                                    {pastRequests.map((item) => (
                                        <Table.Tr key={item._id} onClick={() => router.push(`/me/leave-requests/${item._id}`)}
                                            style={{ cursor: "pointer" }}>
                                            <Table.Td>{typeLabels[item.type] ?? item.type}</Table.Td>
                                            <Table.Td>
                                                {dayjs(item.startDate).format("DD-MM-YYYY")} → {dayjs(item.endDate).format("DD-MM-YYYY")}
                                            </Table.Td>
                                            <Table.Td>{formatRequestDays(item)}</Table.Td>
                                            <Table.Td>{getStatusBadge(item.status)}</Table.Td>
                                            <Table.Td>
                                                <Text size="sm" c="dimmed" lineClamp={1}>
                                                    {item.comment || "—"}
                                                </Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </>
                            )}
                            {displayRequests.length === 0 && (
                                <Table.Tr>
                                    <Table.Td colSpan={5}>
                                        <Text size="sm" c="dimmed" ta="center">
                                            {emptyMessage}
                                        </Text>
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </Box>

                <Stack gap="md" hiddenFrom="sm">
                    {currentRequests.length === 0 && pastRequests.length === 0 && (
                        <Text size="sm" c="dimmed" ta="center">
                            {emptyMessage}
                        </Text>
                    )}
                    {currentRequests.map((item) => (
                        <Paper
                            key={item._id}
                            p="sm"
                            radius="md"
                            withBorder
                            onClick={() => router.push(`/me/leave-requests/${item._id}`)}
                            style={{ cursor: "pointer" }}
                        >
                            <Group justify="space-between" align="center" mb="xs">
                                <Text fw={600} size="md">
                                    {typeLabels[item.type] ?? item.type}
                                </Text>
                                {getStatusBadge(item.status)}
                            </Group>
                            <Group justify="space-between" gap="xs">
                                <Text size="sm" c="dimmed" flex="0 0 auto">
                                    Dates
                                </Text>
                                <Text size="sm">
                                    {dayjs(item.startDate).format("DD-MM-YYYY")} → {dayjs(item.endDate).format("DD-MM-YYYY")}
                                </Text>
                            </Group>
                            <Group justify="space-between" gap="xs">
                                <Text size="sm" c="dimmed" flex="0 0 auto">
                                    Days
                                </Text>
                                <Text size="sm">{formatRequestDays(item)}</Text>
                            </Group>
                            {item.comment && (
                                <Group justify="space-between" gap="xs">
                                    <Text size="sm" c="dimmed" flex="0 0 auto">
                                        Comment
                                    </Text>
                                    <Text size="sm" lineClamp={2}>
                                        {item.comment}
                                    </Text>
                                </Group>
                            )}
                        </Paper>
                    ))}
                    {pastRequests.length > 0 && (
                        <>
                            <Divider label="Past Leaves" labelPosition="center" color="gray.3" />
                            {pastRequests.map((item) => (
                                <Paper
                                    key={item._id}
                                    p="sm"
                                    radius="md"
                                    withBorder
                                    onClick={() => router.push(`/me/leave-requests/${item._id}`)}
                                    style={{ cursor: "pointer" }}
                                >
                                    <Group justify="space-between" align="center" mb="xs">
                                        <Text fw={600} size="md">
                                            {typeLabels[item.type] ?? item.type}
                                        </Text>
                                        {getStatusBadge(item.status)}
                                    </Group>
                                    <Group justify="space-between" gap="xs">
                                        <Text size="sm" c="dimmed" flex="0 0 auto">
                                            Dates
                                        </Text>
                                        <Text size="sm">
                                            {dayjs(item.startDate).format("DD-MM-YYYY")} → {dayjs(item.endDate).format("DD-MM-YYYY")}
                                        </Text>
                                    </Group>
                                    <Group justify="space-between" gap="xs">
                                        <Text size="sm" c="dimmed" flex="0 0 auto">
                                            Days
                                        </Text>
                                        <Text size="sm">{formatRequestDays(item)}</Text>
                                    </Group>
                                    {item.comment && (
                                        <Group justify="space-between" gap="xs">
                                            <Text size="sm" c="dimmed" flex="0 0 auto">
                                                Comment
                                            </Text>
                                            <Text size="sm" lineClamp={2}>
                                                {item.comment}
                                            </Text>
                                        </Group>
                                    )}
                                </Paper>
                            ))}
                        </>
                    )}
                </Stack>

                {displayRequests.length > 0 && (
                    <Stack gap={8} align="center" mt="md">
                        <Pagination
                            total={totalPages}
                            value={activePage}
                            onChange={setPage}
                            size="sm"
                            withEdges
                            hideWithOnePage
                        />
                        <Text size="xs" c="dimmed">
                            {firstVisible}–{lastVisible} of {displayRequests.length}
                        </Text>
                    </Stack>
                )}
            </Paper>
        </Stack>
    );
}
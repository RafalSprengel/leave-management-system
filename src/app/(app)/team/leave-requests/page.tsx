"use client";

import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Group,
  Loader,
  Menu,
  Pagination,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconChevronRight,
  IconDotsVertical,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useTeamLeaveRequests } from "@/hooks/useTeamLeaveRequests";
import { formatRequestDays } from "@/utils/leaveBalance";
import { LEAVE_REQUEST_TYPES, getLeaveTypeLabel } from "@/constants/leaveTypes";
import type { TeamLeaveRequestItem } from "@/types/leaveRequest";
import {
  approveLeaveRequestAsAdmin,
  rejectLeaveRequestAsAdmin,
} from "@/actions/admin/leave/reviewLeaveRequest";
import { deleteLeaveRequestAsAdmin } from "@/actions/admin/leave/deleteLeaveRequest";
import SortableHeader from "@/app/(app)/components/SortableHeader/SortableHeader";
import { sortItems, type SortDirection } from "@/utils/sort";

dayjs.extend(relativeTime);

type SortColumn = "employee" | "type" | "dates" | "days" | "status";

const PAGE_SIZE = 10;

const typeLabels: Record<string, string> = Object.fromEntries(
  LEAVE_REQUEST_TYPES.map((t) => [t, getLeaveTypeLabel(t)]),
);

function formatDateRange(startDate: string, endDate: string): string {
  const start = dayjs(startDate, "YYYY-MM-DD");
  const end = dayjs(endDate, "YYYY-MM-DD");
  return `${start.format("DD-MM-YYYY")} → ${end.format("DD-MM-YYYY")}`;
}

export default function TeamLeaveRequestsPage() {
  const router = useRouter();

  const { requests, loading, refetch } = useTeamLeaveRequests();

  const [statusFilter, setStatusFilter] = useState<string>("Pending");
  const [search, setSearch] = useState("");
  const [sortDirection, setSortDirection] = useState<"newest" | "oldest">("newest");
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [columnDirection, setColumnDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const rejectReasonRef = useRef("");

  function handleSort(column: SortColumn) {
    setPage(1);
    if (sortColumn === column) {
      setColumnDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setColumnDirection("asc");
    }
  }

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    const base = requests.filter((req) => {
      if (statusFilter !== "All" && req.status !== statusFilter.toLowerCase()) {
        return false;
      }

      if (!query) return true;

      return (
        (req.employeeName ?? "").toLowerCase().includes(query) ||
        (req.departmentName ?? "").toLowerCase().includes(query) ||
        (typeLabels[req.type] ?? req.type).toLowerCase().includes(query)
      );
    });

    if (sortColumn) {
      return sortItems(
        base,
        (req) => {
          switch (sortColumn) {
            case "employee":
              return req.employeeName ?? "";
            case "type":
              return typeLabels[req.type] ?? req.type;
            case "dates":
              return dayjs(req.startDate).valueOf();
            case "days":
              return req.daysRequested;
            case "status":
              return req.status;
          }
        },
        columnDirection,
      );
    }

    return [...base].sort((a, b) => {
      const delta =
        dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf();
      return sortDirection === "newest" ? delta : -delta;
    });
  }, [
    requests,
    statusFilter,
    search,
    sortDirection,
    sortColumn,
    columnDirection,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / PAGE_SIZE),
  );
  const activePage = Math.min(page, totalPages);
  const visibleRequests = filteredRequests.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE,
  );
  const firstVisible = (activePage - 1) * PAGE_SIZE + 1;
  const lastVisible = Math.min(activePage * PAGE_SIZE, filteredRequests.length);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  const approvedCount = requests.filter((r) => r.status === "approved").length;

  const handleApprove = (req: TeamLeaveRequestItem) => {
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

  const handleReject = (req: TeamLeaveRequestItem) => {
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

  const handleRemove = (req: TeamLeaveRequestItem) => {
    modals.openConfirmModal({
      title: "Remove Leave Request",
      children: (
        <Text size="sm">
          Are you sure you want to remove this leave request for{" "}
          {req.employeeName || "this employee"}? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Remove", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        const result = await deleteLeaveRequestAsAdmin(req._id);

        if (result.success) {
          notifications.show({
            title: "Removed",
            message: `Leave request for ${req.employeeName || "employee"} has been removed.`,
            color: "green",
            icon: <IconCheck size={16} />,
          });
          await refetch();
        } else {
          notifications.show({
            title: "Error",
            message: result.error || "Failed to remove leave request",
            color: "red",
            icon: <IconX size={16} />,
          });
        }
      },
    });
  };

  return (
    <Stack gap="lg">
      <Title order={2}>Team Leave Requests</Title>

      <Flex direction={{ base: "column", lg: "row" }} gap="md">
        <Box style={{ flex: 1 }}>
          <Paper p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md" align="center">
              <Box>
                <Title order={3} size="h4">
                  All Pending Leave Requests
                </Title>
                <Text size="sm" c="dimmed">
                  Review and override company-wide time off requests
                </Text>
              </Box>
              <Button
                component={Link}
                href="/team/leave-requests/new"
                variant="subtle"
                size="xs"
                rightSection={<IconChevronRight size={14} />}
              >
                Add New
              </Button>
            </Group>

            <Group mb="lg" justify="space-between">
              <SegmentedControl
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                size="xs"
                data={[
                  { label: `Pending (${pendingCount})`, value: "Pending" },
                  { label: `Approved (${approvedCount})`, value: "Approved" },
                  { label: `Rejected (${rejectedCount})`, value: "Rejected" },
                  { label: `All`, value: "All" },
                ]}
                radius="xl"
                color="blue"
              />
              <Group gap="xs" wrap="nowrap">
                <TextInput
                  size="xs"
                  placeholder="Search employee, department or type…"
                  leftSection={<IconSearch size={14} />}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.currentTarget.value);
                    setPage(1);
                  }}
                  style={{ minWidth: 240 }}
                />
                <Tooltip
                  label={
                    sortDirection === "newest"
                      ? "Newest first — click for oldest first"
                      : "Oldest first — click for newest first"
                  }
                >
                  <ActionIcon
                    variant={sortDirection === "newest" ? "light" : "subtle"}
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

            {loading ? (
              <Flex justify="center" py="xl">
                <Loader />
              </Flex>
            ) : filteredRequests.length === 0 ? (
              <Text ta="center" py="xl" c="dimmed">
                {search.trim()
                  ? "No leave requests match your search"
                  : "No leave requests found"}
              </Text>
            ) : (
              <>
              <Box visibleFrom="sm">
              <Table.ScrollContainer minWidth={600}>
                <Table verticalSpacing="sm" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>
                        <SortableHeader label="Employee" active={sortColumn === "employee"} direction={columnDirection} onSort={() => handleSort("employee")} />
                      </Table.Th>
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
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {visibleRequests.map((req) => (
                      <Table.Tr
                        key={req._id}
                        onClick={() =>
                          router.push(`/team/leave-requests/${req._id}`)
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <Table.Td>
                          <Group gap="sm" wrap="nowrap">
                            <Avatar
                              name={req.employeeName}
                              radius="xl"
                              size="sm"
                              color="initials"
                            />
                            <Box>
                              <Text size="xs" fw={500}>
                                {req.employeeName}
                              </Text>
                              <Text fz="11px" c="dimmed">
                                {req.departmentName ?? "No Department"}
                              </Text>
                            </Box>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color="blue" size="xs">
                            {typeLabels[req.type] ?? req.type}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">
                            {formatDateRange(req.startDate, req.endDate)}
                          </Text>
                          <Text fz="11px" c="dimmed">
                            Submitted {dayjs(req.createdAt).fromNow()}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" fw={500}>
                            {formatRequestDays(req, "d")}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            variant="dot"
                            color={
                              req.status === "approved"
                                ? "green"
                                : req.status === "rejected"
                                  ? "red"
                                  : "yellow"
                            }
                            size="xs"
                          >
                            {req.status.charAt(0).toUpperCase() +
                              req.status.slice(1)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4} wrap="nowrap">
                            {req.status === "pending" && (
                              <>
                                <Tooltip label="Approve">
                                  <ActionIcon
                                    variant="light"
                                    color="green"
                                    radius="xl"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApprove(req);
                                    }}
                                  >
                                    <IconCheck size={16} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Reject">
                                  <ActionIcon
                                    variant="light"
                                    color="red"
                                    radius="xl"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReject(req);
                                    }}
                                  >
                                    <IconX size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              </>
                            )}
                            <Menu position="bottom-end" shadow="md">
                              <Menu.Target>
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  radius="xl"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <IconDotsVertical size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item
                                  component={Link}
                                  href={`/team/leave-requests/${req._id}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View Details
                                </Menu.Item>
                                {req.employee && (
                                  <Menu.Item
                                    component={Link}
                                    href={`/team/employees/${req.employee}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Employee Details
                                  </Menu.Item>
                                )}
                                <Menu.Item
                                  color="red"
                                  leftSection={<IconTrash size={16} />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove(req);
                                  }}
                                >
                                  Delete Request
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
              </Box>

              <Stack gap="md" hiddenFrom="sm">
                {visibleRequests.map((req) => (
                  <Paper
                    key={req._id}
                    p="sm"
                    radius="md"
                    withBorder
                    onClick={() => router.push(`/team/leave-requests/${req._id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <Group justify="space-between" align="center" gap="sm">
                      <Group gap="sm" wrap="nowrap">
                        <Avatar
                          name={req.employeeName}
                          radius="xl"
                          size="sm"
                          color="initials"
                        />
                        <Box>
                          <Text size="sm" fw={500}>
                            {req.employeeName}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {req.departmentName ?? "No Department"}
                          </Text>
                        </Box>
                      </Group>
                      <Badge
                        variant="light"
                        size="sm"
                        color={
                          req.status === "approved"
                            ? "green"
                            : req.status === "rejected"
                              ? "red"
                              : "yellow"
                        }
                      >
                        {req.status.charAt(0).toUpperCase() +
                          req.status.slice(1)}
                      </Badge>
                    </Group>

                    <Group justify="space-between" gap="xs">
                      <Text size="sm" c="dimmed">
                        Type
                      </Text>
                      <Badge variant="light" color="blue" size="sm">
                        {typeLabels[req.type] ?? req.type}
                      </Badge>
                    </Group>
                    <Group justify="space-between" gap="xs">
                      <Text size="sm" c="dimmed">
                        Dates
                      </Text>
                      <Text size="sm">
                        {formatDateRange(req.startDate, req.endDate)}
                      </Text>
                    </Group>
                    <Group justify="space-between" gap="xs">
                      <Text size="sm" c="dimmed">
                        Days
                      </Text>
                      <Text size="sm">{formatRequestDays(req, "d")}</Text>
                    </Group>
                    <Group justify="space-between" gap="xs">
                      <Text size="sm" c="dimmed">
                        Submitted
                      </Text>
                      <Text size="sm">{dayjs(req.createdAt).fromNow()}</Text>
                    </Group>

                    <Group gap="sm" align="center" mt="sm">
                      {req.status === "pending" && (
                        <>
                          <Button
                            size="xs"
                            variant="light"
                            color="green"
                            leftSection={<IconCheck size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(req);
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="xs"
                            variant="light"
                            color="red"
                            leftSection={<IconX size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(req);
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Menu position="bottom-end" shadow="md">
                        <Menu.Target>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            radius="xl"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            component={Link}
                            href={`/team/leave-requests/${req._id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Details
                          </Menu.Item>
                          {req.employee && (
                            <Menu.Item
                              component={Link}
                              href={`/team/employees/${req.employee}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              Employee Details
                            </Menu.Item>
                          )}
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={16} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemove(req);
                            }}
                          >
                            Remove Request
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Paper>
                ))}
              </Stack>

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
                  {firstVisible}–{lastVisible} of {filteredRequests.length}
                </Text>
              </Stack>
              </>
            )}
          </Paper>
        </Box>
      </Flex>
    </Stack>
  );
}

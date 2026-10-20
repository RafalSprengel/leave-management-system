'use client'


import { ActionIcon, Badge, Box, Button, Card, Group, Menu, Pagination, Paper, SegmentedControl, Stack, Table, Text, TextInput, Title, useMatches } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconClock, IconDotsVertical, IconEdit, IconKey, IconPlus, IconSearch, IconSend, IconUserCheck, IconUserOff, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { resendInvitation } from "@/actions/admin/employees/resendInvitation";
import { sendPasswordReset } from "@/actions/admin/employees/sendPasswordReset";
import SortableHeader from "@/app/(app)/components/SortableHeader/SortableHeader";
import type { IEmployee } from "@/types/employees";
import { type SortDirection, sortItems } from "@/utils/sort";
import ActivateEmployeeModal from "./ActivateEmployeeModal";
import DeleteEmployeeModal from "./DeleteEmployeeModal";
import EditEmployeeModal from "./EditEmployeeModal";
import NewEmployeeModalContent from "./NewEmployeeModalCntent";

function InvitationStatusBadge({ status }: { status: IEmployee["status"] }) {
    if (status === "active") {
        return (
            <Badge variant="light" color="green" size="sm" leftSection={<IconCheck size={12} />}>
                Accepted
            </Badge>
        );
    }

    if (status === "invited") {
        return (
            <Badge variant="light" color="blue" size="sm" leftSection={<IconClock size={12} />}>
                Invitation sent
            </Badge>
        );
    }

    return (
        <Badge variant="light" color="gray" size="sm">
            Inactive
        </Badge>
    );
}

type SortColumn = "name" | "email" | "department" | "role" | "status" | "tenure";

const PAGE_SIZE = 10;

function getTenureDays(employmentDate: string): number {
    if (!employmentDate) return 0;
    return Math.max(dayjs().diff(dayjs(employmentDate), "day"), 0);
}

function formatTenure(days: number): string {
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    if (years > 0) return `${years}y ${months}m`;
    if (months > 0) return `${months}m ${days % 30}d`;
    return `${days}d`;
}

function getTenureLabel(employmentDate: string): string {
    return employmentDate ? formatTenure(getTenureDays(employmentDate)) : "-";
}

function SortableTh({
    column,
    label,
    sortColumn,
    sortDirection,
    onSort,
}: {
    column: SortColumn;
    label: string;
    sortColumn: SortColumn | null;
    sortDirection: SortDirection;
    onSort: (column: SortColumn) => void;
}) {
    return (
        <Table.Th>
            <SortableHeader
                label={label}
                active={sortColumn === column}
                direction={sortDirection}
                onSort={() => onSort(column)}
            />
        </Table.Th>
    );
}

function EmployeeActionsMenu({ employee }: { employee: IEmployee }) {
    function openEditModal() {
        modals.open({
            modalId: "edit-employee-modal",
            title: "Edit employee",
            size: "lg",
            children: (
                <EditEmployeeModal
                    closeModal={() => modals.close("edit-employee-modal")}
                    employee={employee}
                />
            ),
        });
    }

    function openActivateModal() {
        modals.open({
            modalId: "activate-employee-modal",
            title: "Activate Employee",
            centered: true,
            children: (
                <ActivateEmployeeModal
                    closeModal={() => modals.close("activate-employee-modal")}
                    employee={employee}
                />
            ),
        });
    }

    function openDeactivateModal() {
        modals.open({
            modalId: "deactivate-employee-modal",
            title: "Deactivate Employee",
            centered: true,
            children: (
                <DeleteEmployeeModal
                    closeModal={() => modals.close("deactivate-employee-modal")}
                    employee={employee}
                />
            ),
        });
    }

    function openPasswordResetModal() {
        modals.openConfirmModal({
            modalId: "password-reset-modal",
            title: "Reset password",
            centered: true,
            children: (
                <Text size="sm">
                    Are you sure you want to send a password reset link to{" "}
                    <Text component="span" fw={600}>
                        {employee.firstName} {employee.lastName}
                    </Text>
                    ? They will receive an email with instructions to reset their password.
                </Text>
            ),
            labels: { confirm: "Yes, send reset link", cancel: "Cancel" },
            confirmProps: { color: "blue" },
            onConfirm: async () => {
                const { success, error } = await sendPasswordReset(employee._id);
                if (success) {
                    notifications.show({
                        title: "Success",
                        message: `Password reset link sent to ${employee.email}`,
                        color: "green",
                    });
                } else {
                    notifications.show({
                        title: "Error",
                        message: error || "Failed to send password reset email",
                        color: "red",
                        icon: <IconX size={16} />,
                    });
                }
            },
        });
    }

    function openResendInvitationModal() {
        modals.openConfirmModal({
            modalId: "resend-invitation-modal",
            title: "Resend invitation",
            centered: true,
            children: (
                <Text size="sm">
                    Are you sure you want to resend the invitation to{" "}
                    <Text component="span" fw={600}>
                        {employee.firstName} {employee.lastName}
                    </Text>
                    ? They will receive a new invitation email.
                </Text>
            ),
            labels: { confirm: "Yes, resend invitation", cancel: "Cancel" },
            confirmProps: { color: "blue" },
            onConfirm: async () => {
                const { success, error } = await resendInvitation(employee._id);
                if (success) {
                    notifications.show({
                        title: "Success",
                        message: `Invitation re-sent to ${employee.email}`,
                        color: "green",
                    });
                } else {
                    notifications.show({
                        title: "Error",
                        message: error || "Failed to resend invitation",
                        color: "red",
                        icon: <IconX size={16} />,
                    });
                }
            },
        });
    }

    return (
        <Menu shadow="md" width={220} position="bottom-end" withinPortal>
            <Menu.Target>
                <ActionIcon variant="subtle" aria-label="Employee actions" size="sm">
                    <IconDotsVertical size={16} />
                </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Item
                    leftSection={<IconEdit size={16} />}
                    onClick={openEditModal}
                >
                    Edit
                </Menu.Item>

                {employee.status === "active" && (
                    <Menu.Item
                        leftSection={<IconKey size={16} />}
                        onClick={openPasswordResetModal}
                    >
                        Reset password
                    </Menu.Item>
                )}

                {employee.status === "invited" && (
                    <Menu.Item
                        leftSection={<IconSend size={16} />}
                        onClick={openResendInvitationModal}
                    >
                        Resend invitation
                    </Menu.Item>
                )}

                {(employee.status === "active" || employee.status === "invited") && !employee.isOwner && (
                    <>
                        <Menu.Divider />
                        <Menu.Item
                            color="orange"
                            leftSection={<IconUserOff size={16} />}
                            onClick={openDeactivateModal}
                        >
                            Deactivate
                        </Menu.Item>
                    </>
                )}

                {employee.status === "inactive" && (
                    <>
                        <Menu.Divider />
                        <Menu.Item
                            color="green"
                            leftSection={<IconUserCheck size={16} />}
                            onClick={openActivateModal}
                        >
                            Activate
                        </Menu.Item>
                    </>
                )}
            </Menu.Dropdown>
        </Menu>
    );
}

export default function EmployeeTable({ employees }: { employees: IEmployee[] }) {
    const router = useRouter();
    const isMobile = useMatches({
        base: true,
        sm: false,
    });

    const [filter, setFilter] = useState<"active" | "inactive">("active");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const filteredEmployees = employees.filter((empl) => {
        const query = search.trim().toLowerCase();

        if (!query) {
            if (filter === "active") {
                return empl.status === "active" || empl.status === "invited";
            }
            return empl.status === "inactive";
        }

        return (
            `${empl.firstName} ${empl.lastName}`.toLowerCase().includes(query) ||
            empl.email.toLowerCase().includes(query) ||
            getDepartmentName(empl).toLowerCase().includes(query) ||
            empl.role.toLowerCase().includes(query)
        );
    });

    function getDepartmentName(empl: IEmployee): string {
        return typeof empl.department === "object"
            ? empl.department?.name ?? ""
            : empl.department ?? "";
    }

    function handleSort(column: SortColumn) {
        setPage(1);
        if (sortColumn === column) {
            setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    }

    const sortedEmployees = sortColumn
        ? sortItems(
              filteredEmployees,
              (empl) => {
                  switch (sortColumn) {
                      case "name":
                          return `${empl.firstName} ${empl.lastName}`;
                      case "email":
                          return empl.email;
                      case "department":
                          return getDepartmentName(empl);
                      case "role":
                          return empl.role;
                      case "status":
                          return empl.status;
                      case "tenure":
                          return getTenureDays(empl.employmentDate);
                  }
              },
              sortDirection,
          )
        : filteredEmployees;

    const totalPages = Math.max(
        1,
        Math.ceil(sortedEmployees.length / PAGE_SIZE)
    );
    const activePage = Math.min(page, totalPages);
    const visibleEmployees = sortedEmployees.slice(
        (activePage - 1) * PAGE_SIZE,
        activePage * PAGE_SIZE
    );
    const firstVisible = (activePage - 1) * PAGE_SIZE + 1;
    const lastVisible = Math.min(
        activePage * PAGE_SIZE,
        sortedEmployees.length
    );

    const emptyMessage = search.trim()
        ? "No employees match your search."
        : filter === "active"
          ? "No active employees."
          : "No deactivated employees.";

    function openNewEmployeeModal() {
        modals.open({
            modalId: "new-employee-modal",
            title: "New employee",
            size: "lg",
            children: <NewEmployeeModalContent />
        })
    }

    function openEditModal(employee: IEmployee) {
        modals.open({
            modalId: "edit-employee-modal",
            title: "Edit employee",
            size: "lg",
            children: (
                <EditEmployeeModal
                    closeModal={() => modals.close("edit-employee-modal")}
                    employee={employee}
                />
            ),
        });
    }

    function openDeleteModal(employee: IEmployee) {
        modals.open({
            modalId: "delete-employee-modal",
            title: "Delete Employee",
            centered: true,
            children: (
                <DeleteEmployeeModal
                    closeModal={() => modals.close("delete-employee-modal")}
                    employee={employee}
                />
            ),
        });
    }

    function openPasswordResetModal(employee: IEmployee) {
        modals.openConfirmModal({
            modalId: "password-reset-modal",
            title: "Reset password",
            centered: true,
            children: (
                <Text size="sm">
                    Are you sure you want to send a password reset link to{" "}
                    <Text component="span" fw={600}>
                        {employee.firstName} {employee.lastName}
                    </Text>
                    ? They will receive an email with instructions to reset their password.
                </Text>
            ),
            labels: { confirm: "Yes, send reset link", cancel: "Cancel" },
            confirmProps: { color: "blue" },
            onConfirm: async () => {
                const { success, error } = await sendPasswordReset(employee._id);
                if (success) {
                    notifications.show({
                        title: "Success",
                        message: `Password reset link sent to ${employee.email}`,
                        color: "green",
                    });
                } else {
                    notifications.show({
                        title: "Error",
                        message: error || "Failed to send password reset email",
                        color: "red",
                        icon: <IconX size={16} />,
                    });
                }
            },
        });
    }

    const rows = visibleEmployees.map((empl) => (
        <Table.Tr
            key={empl.email}
            onClick={() => router.push(`/team/employees/${empl._id}/profile`)}
            style={{ cursor: "pointer" }}
        >
            <Table.Td fw={600}>{empl.firstName} {empl.lastName}</Table.Td>
            <Table.Td>{typeof empl.department === 'object' ? empl.department?.name ?? "-" : empl.department ?? "-"}</Table.Td>
            <Table.Td>{empl.role}</Table.Td>
            <Table.Td>{getTenureLabel(empl.employmentDate)}</Table.Td>
            <Table.Td>
                <InvitationStatusBadge status={empl.status} />
            </Table.Td>
            <Table.Td onClick={(e) => e.stopPropagation()}>
                <Group gap={4} justify="flex-end" wrap="nowrap">
                    <EmployeeActionsMenu employee={empl} />
                </Group>
            </Table.Td>
        </Table.Tr>
    ))

    const mobileCards = visibleEmployees.map((empl) => (
        <Card
            key={empl.email}
            withBorder
            shadow="xs"
            radius="md"
            padding="md"
            onClick={() => router.push(`/team/employees/${empl._id}/profile`)}
            style={{ cursor: "pointer" }}
        >
            <Group justify="space-between" align="flex-start" mb="xs" wrap="nowrap">
                <div>
                    <Text fw={600} size="md">
                        {empl.firstName} {empl.lastName}
                    </Text>
                    <Text size="xs" c="dimmed">
                        {empl.email}
                    </Text>
                </div>
                <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
                    <EmployeeActionsMenu employee={empl} />
                </Group>
            </Group>

            <Group justify="space-between" align="center" mt="sm">
                <Text size="xs" c="dimmed">
                    Department
                </Text>
                <Text size="sm">
                    {typeof empl.department === 'object' ? empl.department?.name ?? "-" : empl.department ?? "-"}
                </Text>
            </Group>

            <Group justify="space-between" align="center" mt="xs">
                <Text size="xs" c="dimmed">
                    Role
                </Text>
                <Badge variant="light" size="sm">
                    {empl.role}
                </Badge>
            </Group>

            <Group justify="space-between" align="center" mt="xs">
                <Text size="xs" c="dimmed">
                    Tenure
                </Text>
                <Text size="sm">
                    {getTenureLabel(empl.employmentDate)}
                </Text>
            </Group>

            <Group justify="space-between" align="center" mt="xs">
                <Text size="xs" c="dimmed">
                    Invitation
                </Text>
                <InvitationStatusBadge status={empl.status} />
            </Group>
        </Card>
    ));

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="center">
                <Title order={2} fw='700'>Employees</Title>
                <Button leftSection={<IconPlus size={18} />} onClick={openNewEmployeeModal}>
                    Add employee
                </Button>
            </Group>

            <Paper
                p="md"
                radius="md"
                withBorder
                bg="var(--mantine-color-body)"
                style={{ overflowX: "auto" }}
            >
                <Group justify="space-between" mb="md" gap="xs" wrap="wrap">
                    <SegmentedControl
                        value={filter}
                        onChange={(value) => {
                            setFilter(value as "active" | "inactive");
                            setPage(1);
                        }}
                        data={[
                            { value: "active", label: `Active (${employees.filter(e => e.status === "active" || e.status === "invited").length})` },
                            { value: "inactive", label: `Deactivated (${employees.filter(e => e.status === "inactive").length})` },
                        ]}
                        size="xs"
                    />
                    <TextInput
                        placeholder="Search name, email, department…"
                        leftSection={<IconSearch size={16} />}
                        value={search}
                        onChange={(e) => {
                            setSearch(e.currentTarget.value);
                            setPage(1);
                        }}
                        w={{ base: "100%", sm: 260 }}
                    />
                </Group>

            {isMobile ? (
                <Stack gap="sm">
                    {filteredEmployees.length > 0 ? (
                        mobileCards
                    ) : (
                        <Paper withBorder p="md" radius="md">
                            <Text size="sm" c="dimmed" ta="center">
                                {emptyMessage}
                            </Text>
                        </Paper>
                    )}
                </Stack>
            ) : (
                <Box>
                    <Table>
                        <Table.Thead>
                            <Table.Tr>
                                <SortableTh column="name" label="Name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                                <SortableTh column="department" label="Department" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                                <SortableTh column="role" label="Role" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                                <SortableTh column="tenure" label="Tenure" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                                <SortableTh column="status" label="Invitation" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                                <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {rows.length > 0 ? (
                                rows
                            ) : (
                                <Table.Tr>
                                    <Table.Td colSpan={6}>{emptyMessage}</Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </Box>
            )}
            </Paper>

            {filteredEmployees.length > 0 && (
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
                        {firstVisible}–{lastVisible} of {filteredEmployees.length}
                    </Text>
                </Stack>
            )}
        </Stack>
    )
}
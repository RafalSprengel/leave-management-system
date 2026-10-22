"use client";

import {
    Button,
    Group,
    Modal,
    NumberInput,
    Paper,
    Progress,
    Stack,
    Table,
    Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setLeaveAllowance } from "@/actions/admin/leaveAllowances/setLeaveAllowance";
import type { LeaveAllowanceType } from "@/db/models/LeaveAllowance";

export interface AllowanceRow {
    type: LeaveAllowanceType;
    label: string;
    days: number;
}

interface EmployeeAllowancesTableProps {
    employeeId: string;
    rows: AllowanceRow[];
    usedDays: number;
}

export default function EmployeeAllowancesTable({
    employeeId,
    rows,
    usedDays,
}: EmployeeAllowancesTableProps) {
    const router = useRouter();
    const [values, setValues] = useState<AllowanceRow[]>(rows);
    const [active, setActive] = useState<AllowanceRow | null>(null);
    const [inputValue, setInputValue] = useState<number | string>(0);
    const [isPending, startTransition] = useTransition();

    const openModal = (row: AllowanceRow) => {
        setActive(row);
        setInputValue(row.days ?? 0);
    };

    const closeModal = () => {
        setActive(null);
    };

    const handleSave = () => {
        if (!active) return;

        const days =
            typeof inputValue === "number" ? inputValue : Number(inputValue);

        if (!Number.isFinite(days) || days < 0) {
            notifications.show({
                color: "red",
                title: "Invalid value",
                message: "Please enter a valid non-negative number of days.",
            });
            return;
        }

        const row = active;

        startTransition(async () => {
            const res = await setLeaveAllowance({
                employeeId,
                type: row.type,
                days,
            });

            if (!res.success) {
                notifications.show({
                    color: "red",
                    title: "Failed to save",
                    message: res.error,
                });
                return;
            }

            setValues((prev) =>
                prev.map((r) => (r.type === row.type ? { ...r, days } : r))
            );
            notifications.show({
                color: "green",
                title: "Saved",
                message: `${row.label} set to ${days} day(s).`,
            });
            setActive(null);
            router.refresh();
        });
    };

    const annual = values.find((r) => r.type === "holiday");
    const annualAllowance = annual?.days ?? 0;
    const annualRemaining = Math.max(annualAllowance - usedDays, 0);
    const progressValue =
        annualAllowance > 0 ? (usedDays / annualAllowance) * 100 : 0;

    return (
        <Stack gap="md">
            <Paper withBorder radius="md">
                <Table>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Leave type</Table.Th>
                            <Table.Th>Allowance</Table.Th>
                            <Table.Th>Days used</Table.Th>
                            <Table.Th>Days remaining</Table.Th>
                            <Table.Th />
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {values.map((row) => {
                            const isAnnual = row.type === "holiday";
                            return (
                                <Table.Tr key={row.type}>
                                    <Table.Td>{row.label}</Table.Td>
                                    <Table.Td>
                                        {row.days > 0 ? `${row.days} days` : "—"}
                                    </Table.Td>
                                    <Table.Td>
                                        {isAnnual ? `${usedDays} days` : "—"}
                                    </Table.Td>
                                    <Table.Td>
                                        {isAnnual ? `${annualRemaining} days` : "—"}
                                    </Table.Td>
                                    <Table.Td>
                                        <Group justify="flex-end">
                                            <Button
                                                size="xs"
                                                variant="light"
                                                onClick={() => openModal(row)}
                                            >
                                                Set
                                            </Button>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            );
                        })}
                    </Table.Tbody>
                </Table>
            </Paper>

            <Paper withBorder radius="md" p="md">
                <Group justify="space-between" mb="xs">
                    <Text fw={600} size="sm">
                        Holiday allowance usage
                    </Text>
                    <Text size="xs" c="dimmed">
                        {usedDays} / {annualAllowance} days used
                    </Text>
                </Group>
                <Progress
                    value={Math.min(progressValue, 100)}
                    size="lg"
                    color={progressValue >= 100 ? "red" : "blue"}
                />
            </Paper>

            <Modal
                opened={active !== null}
                onClose={closeModal}
                title={active ? `Set ${active.label}` : ""}
                centered
            >
                <Stack gap="md">
                    <NumberInput
                        label="Number of days"
                        description="Allowed days for this leave type"
                        min={0}
                        decimalScale={2}
                        allowNegative={false}
                        value={inputValue}
                        onChange={setInputValue}
                    />

                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeModal}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} loading={isPending}>
                            Save
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
}

'use client'

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@mantine/form";
import { Stack, Button, TextInput, Select, NumberInput, Group, Flex, Text, Table } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { modals } from "@mantine/modals";
import { createEmployee } from "@/actions/admin/employees/createEmployee";
import { useDepartments } from "@/hooks/useDepartments";
import { useRoles } from "@/hooks/useRoles";
import { useManagers } from "@/hooks/useManagers";
import { getOrgSettings } from "@/actions/admin/settings/getOrgSettings";
import { formatManagerLabel } from "@/utils/formatManagerLabel";
import {
    DEFAULT_LEAVE_ALLOWANCE_DAYS,
    LEAVE_ALLOWANCE_TYPES,
    getLeaveAllowanceLabel,
} from "@/constants/leaveAllowanceTypes";

export default function NewEmployeeModalContent() {
    const router = useRouter();
    const { departments, loading: isLoadingDepartments } = useDepartments();
    const { roles, loading: isLoadingRoles } = useRoles();
    const { data: managers, isLoading: isLoadingManagers } = useManagers();
    const [submitting, setSubmitting] = useState(false);

    const form = useForm({
        initialValues: {
            firstName: "",
            lastName: "",
            email: "",
            role: "Employee",
            department: "",
            managerId: "",
            allowances: Object.fromEntries(
                LEAVE_ALLOWANCE_TYPES.map((t) => [t, DEFAULT_LEAVE_ALLOWANCE_DAYS[t]]),
            ) as Record<string, number>,
            employmentDate: null as Date | null,
        },
        validate: {
            firstName: (value) => (value ? null : "First name is required"),
            lastName: (value) => (value ? null : "Last name is required"),
            email: (value) => (value ? null : "Email is required"),
            role: (value) => (value ? null : "Role is required"),
            department: (value) => (value ? null : "Department is required"),
            employmentDate: (value) => (value ? null : "Employment date is required"),
        }
    });

    // Prefill allowance fields from the organization's default allowances.
    // Mantine's `form` object is re-created on every render, so we must guard
    // the effect with a ref to run it only once (otherwise it would reset the
    // user's input on every keystroke).
    const loadedDefaults = useRef(false);
    useEffect(() => {
        if (loadedDefaults.current) return;
        loadedDefaults.current = true;
        (async () => {
            const res = await getOrgSettings();
            if (!res.success) return;
            const defaults = res.data.defaultAllowances ?? {};
            const next: Record<string, number> = {};
            for (const type of LEAVE_ALLOWANCE_TYPES) {
                const fallback =
                    type === "holiday"
                        ? (res.data.defaultAnnualLeaveDays ??
                          DEFAULT_LEAVE_ALLOWANCE_DAYS.holiday)
                        : DEFAULT_LEAVE_ALLOWANCE_DAYS[type];
                next[type] = defaults[type] ?? fallback;
            }
            form.setFieldValue("allowances", next);
        })();
    }, [form]);

    async function handleSubmit() {
        const { hasErrors } = form.validate();
        if (hasErrors) return;

        setSubmitting(true);
        try {
            const { success, error, errorCode } = await createEmployee({
                firstName: form.values.firstName,
                lastName: form.values.lastName,
                email: form.values.email,
                role: form.values.role as "Employee" | "Manager",
                department: form.values.department,
                managerId: form.values.managerId || undefined,
                holidayAllowance: form.values.allowances.holiday,
                allowances: Object.fromEntries(
                    Object.entries(form.values.allowances).filter(
                        ([type]) => type !== "holiday",
                    ),
                ),
                employmentDate: form.values.employmentDate as unknown as string,
            });

            if (success) {
                const employeeName = `${form.values.firstName} ${form.values.lastName}`;
                const employeeEmail = form.values.email;

                modals.close("new-employee-modal");

                modals.open({
                    modalId: "employee-created-modal",
                    title: "Employee created",
                    centered: true,
                    children: (
                        <Stack gap="md">
                            <Text size="sm">
                                A new account has been created for{" "}
                                <Text component="span" fw={600}>
                                    {employeeName}
                                </Text>
                                . An invitation email has been sent to{" "}
                                <Text component="span" fw={600}>
                                    {employeeEmail}
                                </Text>
                                .
                            </Text>
                            <Text size="sm" c="dimmed">
                                The employee will need to accept the invitation to activate their account.
                            </Text>
                            <Group grow mt="md">
                                <Button
                                    onClick={() => {
                                        modals.close("employee-created-modal");
                                        router.refresh();
                                    }}
                                >
                                    OK
                                </Button>
                            </Group>
                        </Stack>
                    ),
                });
            } else if (errorCode === "DUPLICATE_EMAIL") {
                form.setFieldError("email", error || "An employee with this email already exists.");
            } else {
                form.setFieldError("email", error || "Failed to create employee");
            }
        } catch (err) {
            console.error("Unexpected error in handleSubmit:", err);
            form.setFieldError("email", err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setSubmitting(false);
        }
    }

    function handleCancel() {
        modals.close("new-employee-modal");
    }

    // Blokada formularza podczas ładowania opcji LUB wysyłania
    const isFormDisabled = isLoadingDepartments || isLoadingRoles || isLoadingManagers || submitting;

    return (
        <Stack gap="md">
            <Flex direction={{ base: 'column', sm: 'row' }} gap="md">
                <TextInput
                    label="First name"
                    placeholder="e.g. John"
                    {...form.getInputProps("firstName")}
                    flex={1}
                    disabled={isFormDisabled}
                />
                <TextInput
                    label="Last name"
                    placeholder="e.g. Doe"
                    {...form.getInputProps("lastName")}
                    flex={1}
                    disabled={isFormDisabled}
                />
            </Flex>

            <Flex direction={{ base: 'column', sm: 'row' }} gap="md">
                <TextInput
                    label="Email"
                    placeholder="e.g. john.doe@mail.com"
                    {...form.getInputProps("email")}
                    flex={1}
                    disabled={isFormDisabled}
                />
                <Select
                    label="Role"
                    placeholder={isLoadingRoles ? "Loading roles..." : "Select role"}
                    data={roles}
                    loading={isLoadingRoles}
                    disabled={isFormDisabled}
                    {...form.getInputProps("role")}
                    flex={1}
                />
            </Flex>

            <Flex direction={{ base: 'column', sm: 'row' }} gap="md">
                <Select
                    label="Department"
                    placeholder={isLoadingDepartments ? "Loading departments..." : "Select department"}
                    loading={isLoadingDepartments}
                    disabled={isFormDisabled}
                    data={departments.map((d) => ({ value: d._id, label: d.name }))}
                    {...form.getInputProps("department")}
                    flex={1}
                />
                <Select
                    label="Manager"
                    placeholder={isLoadingManagers ? "Loading managers..." : "Select manager"}
                    loading={isLoadingManagers}
                    disabled={isFormDisabled || form.values.role === "Manager"}
                    data={managers.map((m) => ({ value: m._id, label: formatManagerLabel(m) }))}
                    {...form.getInputProps("managerId")}
                    flex={1}
                    clearable
                />
            </Flex>

            <Flex direction={{ base: 'column', sm: 'row' }} gap="md">
                <DatePickerInput
                    label="Employment Date / Start Date"
                    placeholder="Select employment date"
                    {...form.getInputProps("employmentDate")}
                    flex={1}
                    disabled={isFormDisabled}
                />
            </Flex>

            <Stack gap={6} mt="lg">
                <Text size="sm" fw={600}>
                    Allowance:
                </Text>
                <Table withTableBorder withColumnBorders>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Leave type</Table.Th>
                            <Table.Th w={140}>Days</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {LEAVE_ALLOWANCE_TYPES.map((type) => (
                            <Table.Tr key={type}>
                                <Table.Td>{getLeaveAllowanceLabel(type)}</Table.Td>
                                <Table.Td>
                                    <NumberInput
                                        placeholder="0"
                                        min={0}
                                        disabled={isFormDisabled}
                                        {...form.getInputProps(`allowances.${type}`)}
                                    />
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Stack>

            <Group grow mt="md">
                <Button onClick={handleCancel} variant="light" disabled={submitting}>Cancel</Button>
                <Button onClick={handleSubmit} loading={submitting}>Create</Button>
            </Group>
        </Stack>
    );
}
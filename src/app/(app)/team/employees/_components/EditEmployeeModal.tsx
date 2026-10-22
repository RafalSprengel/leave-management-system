'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@mantine/form";
import { Stack, Button, TextInput, Select, NumberInput, Group, Flex } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { getDepartments } from "@/actions/manager/employees/getDepartments";
import { getRoles } from "@/actions/public/roles/getRoles";
import { getManagers } from "@/actions/manager/employees/getManagers";
import { updateEmployee } from "@/actions/admin/employees/updateEmployee";
import { formatManagerLabel } from "@/utils/formatManagerLabel";
import type { IEmployee, IManager } from "@/types/employees";
import type { IDepartment } from "@/types/department";
import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";

export default function EditEmployeeModal({
    closeModal,
    employee,
}: {
    closeModal: () => void;
    employee: IEmployee;
}) {
    const router = useRouter();
    const [departments, setDepartments] = useState<IDepartment[]>([]);
    const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
    const [roles, setRoles] = useState<string[]>([]);
    const [isLoadingRoles, setIsLoadingRoles] = useState(false);
    const [managersList, setManagersList] = useState<IManager[]>([]);
    const [isLoadingManagers, setIsLoadingManagers] = useState(false);
    const [loading, setLoading] = useState(false);

    const departmentId =
        typeof employee.department === "object"
            ? employee.department?._id ?? ""
            : employee.department ?? "";

    const form = useForm({
        initialValues: {
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            role: employee.role,
            department: departmentId,
            managerId: employee.managerId ?? "",
            holidayAllowance: employee.holidayAllowance,
            employmentDate: employee.employmentDate ? new Date(employee.employmentDate) : null,
        },
        validate: {
            firstName: (value) => (value ? null : "First name is required"),
            lastName: (value) => (value ? null : "Last name is required"),
            email: (value) => (value ? null : "Email is required"),
            role: (value) => (value ? null : "Role is required"),
            department: (value) => (value ? null : "Department is required"),
            holidayAllowance: (value) => (value ? null : "Holiday allowance is required"),
            employmentDate: (value) => (value ? null : "Employment date is required"),
        },
    });

    async function handleSubmit() {
        const { hasErrors } = form.validate();
        if (hasErrors) return;

        setLoading(true);
        try {
            const { success, error, errorCode } = await updateEmployee({
                _id: employee._id,
                firstName: form.values.firstName,
                lastName: form.values.lastName,
                email: form.values.email,
                role: form.values.role,
                department: form.values.department,
                managerId: form.values.managerId || undefined,
                holidayAllowance: form.values.holidayAllowance,
                employmentDate: form.values.employmentDate as unknown as string,
            });

            if (success) {
                notifications.show({
                    title: "Success",
                    message: "Employee updated successfully",
                    color: "green",
                });
                closeModal();
                router.refresh();
            } else if (errorCode === "DUPLICATE_EMAIL") {
                form.setFieldError("email", error || "An employee with this email already exists.");
            } else {
                notifications.show({
                    title: "Error",
                    message: error || "Failed to update employee",
                    color: "red",
                    icon: <IconX />,
                });
            }
        } catch (err) {
            console.error("Unexpected error in handleSubmit:", err);
            notifications.show({
                title: "Error",
                message: err instanceof Error ? err.message : "An unexpected error occurred",
                color: "red",
                icon: <IconX />,
            });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        async function loadDepartments() {
            setIsLoadingDepartments(true);
            const { success, data, error } = await getDepartments();
            if (success) {
                setDepartments(data);
            } else {
                notifications.show({ title: "Error", message: error, color: "red", icon: <IconX /> });
            }
            setIsLoadingDepartments(false);
        }
        loadDepartments();

        async function loadRoles() {
            setIsLoadingRoles(true);
            const { success, data, error } = await getRoles();
            if (success) {
                setRoles(data);
            } else {
                notifications.show({ title: "Error", message: error, color: "red", icon: <IconX /> });
            }
            setIsLoadingRoles(false);
        }
        loadRoles();

        async function loadManagers() {
            setIsLoadingManagers(true);
            const { success, data, error } = await getManagers();
            if (success && data) {
                setManagersList(data);
            } else {
                notifications.show({ title: "Error", message: error, color: "red", icon: <IconX /> });
            }
            setIsLoadingManagers(false);
        }
        loadManagers();
    }, []);

    return (
        <Stack gap="md">
            <Flex direction={{ base: 'column', sm: 'row' }} gap="md">
                <TextInput
                    label="First name"
                    placeholder="e.g. John"
                    {...form.getInputProps("firstName")}
                    flex={1}
                    disabled={loading}
                />
                <TextInput
                    label="Last name"
                    placeholder="e.g. Doe"
                    {...form.getInputProps("lastName")}
                    flex={1}
                    disabled={loading}
                />
            </Flex>

            <Flex direction={{ base: 'column', sm: 'row' }} gap="md">
                <TextInput
                    label="Email"
                    placeholder="e.g. john.doe@mail.com"
                    {...form.getInputProps("email")}
                    flex={1}
                    disabled={loading}
                />
                <Select
                    label="Role"
                    placeholder={
                        isLoadingRoles ? "Loading roles..." :
                            roles.length > 0 ? "Select role" :
                                "No roles found"
                    }
                    data={roles}
                    loading={isLoadingRoles}
                    disabled={isLoadingRoles || loading}
                    {...form.getInputProps("role")}
                    flex={1}
                />
            </Flex>

            <Flex direction={{ base: 'column', sm: 'row' }} gap="md">
                <Select
                    label="Department"
                    placeholder={isLoadingDepartments ? "Loading departments..." :
                        departments.length > 0 ? "Select department" :
                            "No departments found"
                    }
                    loading={isLoadingDepartments}
                    disabled={isLoadingDepartments || loading}
                    data={departments.map((department) => ({
                        value: department._id,
                        label: department.name,
                    }))}
                    {...form.getInputProps("department")}
                    flex={1}
                />
                <Select
                    label="Manager"
                    placeholder={
                        isLoadingManagers ? "Loading managers..." :
                            managersList.length > 0 ? "Select manager" :
                                "No managers found"
                    }
                    loading={isLoadingManagers}
                    disabled={isLoadingManagers || loading || form.values.role === "Manager"}
                    data={managersList.map((manager) => ({
                        value: manager._id,
                        label: formatManagerLabel(manager),
                    }))}
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
                    disabled={loading}
                />
                <NumberInput
                    label="Proposed Holiday"
                    placeholder="e.g. 20"
                    flex={1}
                    {...form.getInputProps("holidayAllowance")}
                    disabled={loading}
                />
            </Flex>

            <Group grow mt="md">
                <Button onClick={closeModal} variant="light" disabled={loading}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit} loading={loading}>
                    Save
                </Button>
            </Group>
        </Stack>
    );
}
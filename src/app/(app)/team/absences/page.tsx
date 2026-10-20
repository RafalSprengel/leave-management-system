"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
    ActionIcon,
    Avatar,
    Badge,
    Button,
    Card,
    Group,
    Loader,
    Modal,
    NumberInput,
    Pagination,
    Select,
    Stack,
    Text,
    TextInput,
    Textarea,
    Title,
    Tooltip,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconCalendarOff,
    IconPlus,
    IconSearch,
    IconTrash,
    IconUserOff,
} from "@tabler/icons-react";
import dayjs from "dayjs";

import { getAbsences } from "@/actions/admin/absences/getAbsences";
import { createAbsence } from "@/actions/admin/absences/createAbsence";
import { deleteAbsence } from "@/actions/admin/absences/deleteAbsence";
import { useEmployees } from "@/hooks/useEmployees";
import { useNonWorkingDays } from "@/hooks/useNonWorkingDays";
import { countWorkingDays, isWeekend } from "@/utils/workingDays";
import type { IAbsenceItem } from "@/types/absence";
import type { AbsenceType } from "@/db/models/Absence";

const TYPE_LABELS: Record<AbsenceType, string> = {
    sick: "Sick Leave",
    unauthorised: "Unauthorised",
    other: "Other",
};

const TYPE_COLORS: Record<AbsenceType, string> = {
    sick: "orange",
    unauthorised: "red",
    other: "gray",
};

const PAGE_SIZE = 10;

type FormValues = {
    employee: string | null;
    dateRange: [Date | null, Date | null];
    type: AbsenceType;
    note: string;
};

export default function AbsencesPage() {
    const [absences, setAbsences] = useState<IAbsenceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [page, setPage] = useState(1);

    const { employees, loading: employeesLoading } = useEmployees();
    const { bankHolidaysMap, closuresMap } = useNonWorkingDays();

    const nonWorkingDates = useMemo(() => {
        const set = new Set<string>();
        bankHolidaysMap.forEach((_, date) => {
            set.add(date);
        });
        closuresMap.forEach((_, date) => {
            set.add(date);
        });
        return set;
    }, [bankHolidaysMap, closuresMap]);

    const employeeOptions = useMemo(
        () =>
            employees.map((e) => ({
                value: e._id,
                label: `${e.firstName} ${e.lastName}`,
            })),
        [employees]
    );

    const today = new Date();

    const form = useForm<FormValues>({
        initialValues: {
            employee: null,
            dateRange: [today, today],
            type: "sick",
            note: "",
        },
        validate: {
            employee: (v) => (!v ? "Please select an employee" : null),
            dateRange: (v) => {
                if (!v[0] || !v[1]) return "Please select a date range";
                if (countWorkingDays(v[0], v[1], nonWorkingDates) <= 0) {
                    return "Selected range contains only non-working days";
                }
                return null;
            },
        },
    });

    const loadAbsences = async () => {
        setLoading(true);
        const res = await getAbsences();
        if (res.success) {
            setAbsences(res.data);
        } else {
            notifications.show({
                color: "red",
                title: "Failed to load absences",
                message: res.error,
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        loadAbsences();
    }, []);

    const filteredAbsences = useMemo(() => {
        let result = absences;
        if (typeFilter) {
            result = result.filter((a) => a.type === typeFilter);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                (a) =>
                    a.employeeName?.toLowerCase().includes(q) ||
                    a.departmentName?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [absences, typeFilter, search]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredAbsences.length / PAGE_SIZE)
    );
    const activePage = Math.min(page, totalPages);
    const visibleAbsences = filteredAbsences.slice(
        (activePage - 1) * PAGE_SIZE,
        activePage * PAGE_SIZE
    );
    const firstVisible = (activePage - 1) * PAGE_SIZE + 1;
    const lastVisible = Math.min(
        activePage * PAGE_SIZE,
        filteredAbsences.length
    );

    const handleSubmit = (values: FormValues) => {
        if (!values.employee || !values.dateRange[0] || !values.dateRange[1])
            return;

        const startDate = dayjs(values.dateRange[0]).format("YYYY-MM-DD");
        const endDate = dayjs(values.dateRange[1]).format("YYYY-MM-DD");

        startTransition(async () => {
            const res = await createAbsence({
                employee: values.employee!,
                startDate,
                endDate,
                type: values.type,
                note: values.note,
            });

            if (res.success) {
                notifications.show({
                    color: "green",
                    title: "Absence recorded",
                    message: `${res.data.employeeName} — ${res.data.daysCount} day(s) added.`,
                });
                setModalOpen(false);
                form.reset();
                await loadAbsences();
            } else {
                notifications.show({
                    color: "red",
                    title: "Failed to record absence",
                    message: res.error,
                });
            }
        });
    };

    const handleDelete = (id: string, employeeName?: string) => {
        modals.openConfirmModal({
            title: "Remove absence record",
            children: (
                <Text size="sm">
                    Remove the absence record for{" "}
                    <Text component="span" fw={600}>
                        {employeeName ?? "this employee"}
                    </Text>
                    ? This cannot be undone.
                </Text>
            ),
            labels: { confirm: "Remove", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                setAbsences((prev) => prev.filter((a) => a.id !== id));
                startTransition(async () => {
                    const res = await deleteAbsence(id);
                    if (!res.success) {
                        notifications.show({
                            color: "red",
                            title: "Failed to delete absence",
                            message: res.error ?? "Unknown error",
                        });
                        await loadAbsences();
                    }
                });
            },
        });
    };

    return (
        <>
            <Stack gap="md" style={{ maxWidth: 800 }}>
                <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                    <Title order={4} m={0}>
                        Absences
                    </Title>

                    <Group gap="xs" wrap="wrap">
                        <TextInput
                            size="xs"
                            placeholder="Search employee or department…"
                            leftSection={<IconSearch size={14} />}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.currentTarget.value);
                                setPage(1);
                            }}
                            style={{ minWidth: 220 }}
                        />
                        <Select
                            size="xs"
                            placeholder="All types"
                            clearable
                            data={Object.entries(TYPE_LABELS).map(([value, label]) => ({
                                value,
                                label,
                            }))}
                            value={typeFilter}
                            onChange={(value) => {
                                setTypeFilter(value);
                                setPage(1);
                            }}
                            style={{ minWidth: 150 }}
                        />
                        <Button
                            size="xs"
                            leftSection={<IconPlus size={14} />}
                            onClick={() => setModalOpen(true)}
                        >
                            Record Absence
                        </Button>
                    </Group>
                </Group>

                {loading ? (
                    <Group justify="center" py="xl">
                        <Loader size="sm" />
                    </Group>
                ) : filteredAbsences.length === 0 ? (
                    <Stack align="center" gap="xs" py="xl" c="dimmed">
                        <IconUserOff size={36} stroke={1.2} />
                        <Text size="sm">
                            {absences.length === 0
                                ? "No absences recorded yet."
                                : "No absences match the current filters."}
                        </Text>
                    </Stack>
                ) : (
                    <Stack gap="xs">
                        {visibleAbsences.map((a) => (
                            <Card
                                key={a.id}
                                p="sm"
                                radius="sm"
                                withBorder
                                bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))"
                            >
                                <Group justify="space-between" wrap="nowrap" align="flex-start">
                                    <Group gap="sm" wrap="nowrap" align="flex-start">
                                        <Avatar radius="xl" size="md" color="gray">
                                            {(a.employeeName ?? "?")
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .slice(0, 2)
                                                .toUpperCase()}
                                        </Avatar>
                                        <div style={{ minWidth: 0 }}>
                                            <Group gap="xs" wrap="wrap">
                                                <Text size="sm" fw={600}>
                                                    {a.employeeName ?? "Unknown"}
                                                </Text>
                                                <Badge
                                                    size="xs"
                                                    color={TYPE_COLORS[a.type]}
                                                    variant="light"
                                                >
                                                    {TYPE_LABELS[a.type]}
                                                </Badge>
                                            </Group>
                                            {a.departmentName && (
                                                <Text size="xs" c="dimmed">
                                                    {a.departmentName}
                                                </Text>
                                            )}
                                            <Text size="xs" c="dimmed" mt={2}>
                                                <IconCalendarOff
                                                    size={11}
                                                    style={{ verticalAlign: "middle", marginRight: 4 }}
                                                />
                                                {dayjs(a.startDate).format("D MMM YYYY")}
                                                {a.startDate !== a.endDate &&
                                                    ` → ${dayjs(a.endDate).format("D MMM YYYY")}`}
                                                {" · "}
                                                <Text component="span" fw={500}>
                                                    {a.daysCount} day{a.daysCount !== 1 ? "s" : ""}
                                                </Text>
                                            </Text>
                                            {a.note && (
                                                <Text size="xs" c="dimmed" mt={2} fs="italic">
                                                    {a.note}
                                                </Text>
                                            )}
                                        </div>
                                    </Group>

                                    <Tooltip label="Remove record" withArrow>
                                        <ActionIcon
                                            color="red"
                                            variant="subtle"
                                            onClick={() => handleDelete(a.id, a.employeeName)}
                                        >
                                            <IconTrash size={16} />
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                            </Card>
                        ))}
                        <Stack gap={8} align="center" mt="sm">
                            <Pagination
                                total={totalPages}
                                value={activePage}
                                onChange={setPage}
                                size="sm"
                                withEdges
                                hideWithOnePage
                            />
                            <Text size="xs" c="dimmed">
                                {firstVisible}–{lastVisible} of{" "}
                                {filteredAbsences.length}
                            </Text>
                        </Stack>
                    </Stack>
                )}
            </Stack>

            <Modal
                opened={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    form.reset();
                }}
                title="Record Absence"
                size="md"
            >
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="md">
                        <Select
                            label="Employee"
                            placeholder="Select employee"
                            data={employeeOptions}
                            searchable
                            disabled={employeesLoading}
                            {...form.getInputProps("employee")}
                        />

                        <DatePickerInput
                            type="range"
                            allowSingleDateInRange
                            label="Absence period"
                            placeholder="Pick date range"
                            description="Weekends cannot be selected — only working days are counted."
                            firstDayOfWeek={1}
                            excludeDate={(date) => isWeekend(date)}
                            getDayProps={(date) => {
                                const key = dayjs(date).format("YYYY-MM-DD");
                                const weekend = isWeekend(date);
                                const nonWorking = nonWorkingDates.has(key);

                                if (weekend) {
                                    return {
                                        style: {
                                            color: "var(--mantine-color-gray-5)",
                                            textDecoration: "line-through",
                                        },
                                    };
                                }
                                if (nonWorking) {
                                    return {
                                        style: {
                                            backgroundColor: "var(--mantine-color-orange-1)",
                                            color: "var(--mantine-color-orange-9)",
                                            fontWeight: 700,
                                            borderRadius: 8,
                                        },
                                    };
                                }
                                return {};
                            }}
                            {...form.getInputProps("dateRange")}
                        />

                        <Select
                            label="Type"
                            data={Object.entries(TYPE_LABELS).map(([value, label]) => ({
                                value,
                                label,
                            }))}
                            {...form.getInputProps("type")}
                        />

                        <Textarea
                            label="Note (optional)"
                            placeholder="e.g. Medical certificate provided"
                            rows={2}
                            {...form.getInputProps("note")}
                        />

                        <Group justify="flex-end" mt="xs">
                            <Button
                                variant="default"
                                onClick={() => {
                                    setModalOpen(false);
                                    form.reset();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                loading={isPending}
                                leftSection={<IconPlus size={14} />}
                            >
                                Record Absence
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </>
    );
}

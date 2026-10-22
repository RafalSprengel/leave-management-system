"use client";

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Container,
  Divider,
  Flex,
  Group,
  Paper,
  Popover,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { DatePicker, DatePickerProps } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { IconAlertTriangle, IconCalendar, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createLeaveRequest } from "@/actions/employee/leave/createLeaveRequest";
import { getMyLeaveBalance, type LeaveBalanceItem } from "@/actions/employee/leave/getMyLeaveBalance";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useMyLeaveRequests } from "@/hooks/useMyLeaveRequests";
import { useNonWorkingDays } from "@/hooks/useNonWorkingDays";
import { countWorkingDays } from "@/utils/workingDays";
import { formatDateList } from "@/utils/formatDateList";
import { findBookedWorkingDaysInRange, findNonWorkingInRange } from "@/utils/dateRangeRules";
import {
  LEAVE_REQUEST_TYPES,
  LEAVE_TYPE_META,
  type LeaveRequestType,
} from "@/constants/leaveTypes";
import "@mantine/dates/styles.css";

const dotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  flexShrink: 0,
};

export default function NewEmployeeLeaveRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balance, setBalance] = useState<LeaveBalanceItem[]>([]);
  const [balancePeriod, setBalancePeriod] = useState<{ start: string; end: string } | null>(null);
  const { employee, loading: employeeLoading } = useCurrentEmployee();
  const { requests: myRequests, loading: loadingMyRequests } =
    useMyLeaveRequests();
  const {
    bankHolidaysMap,
    closuresMap,
    loading: loadingNonWorking,
  } = useNonWorkingDays();

  const dataLoading = loadingMyRequests || loadingNonWorking;

  const [opened, setOpened] = useState(false);

  useEffect(() => {
    getMyLeaveBalance().then((result) => {
      if (result.success) {
        setBalance(result.data);
        setBalancePeriod(result.period);
      }
    });
  }, []);

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

  const myApprovedDates = useMemo(() => {
    const dates = new Set<string>();
    myRequests
      .filter((req) => req.status === "approved")
      .forEach((req) => {
        let cur = dayjs(req.startDate);
        const last = dayjs(req.endDate);
        while (cur.isBefore(last) || cur.isSame(last, "day")) {
          dates.add(cur.format("YYYY-MM-DD"));
          cur = cur.add(1, "day");
        }
      });
    return dates;
  }, [myRequests]);

  const isUnavailable = (date: Date | string) => {
    const key = dayjs(date).format("YYYY-MM-DD");
    return nonWorkingDates.has(key);
  };

  const form = useForm({
    initialValues: {
      dateRange: [null, null] as [Date | null, Date | null],
      type: "holiday" as LeaveRequestType,
      comment: "",
    },
    validate: {
      dateRange: (value) => {
        if (!value[0] || !value[1]) {
          return "Please select both start and end dates";
        }
        return null;
      },
    },
  });

  const startDate = form.values.dateRange[0];
  const endDate = form.values.dateRange[1];

  const startDateStr = form.values.dateRange[0]
    ? dayjs(form.values.dateRange[0]).format("YYYY-MM-DD")
    : null;
  const endDateStr = form.values.dateRange[1]
    ? dayjs(form.values.dateRange[1]).format("YYYY-MM-DD")
    : null;
  const formattedRange =
    startDateStr && endDateStr
      ? `${startDateStr} – ${endDateStr}`
      : startDateStr
        ? startDateStr
        : "";

  const getDayCellProps: DatePickerProps<"range">["getDayProps"] = (date) => {
    const key = dayjs(date).format("YYYY-MM-DD");
    const isLeave = myApprovedDates.has(key);
    const isBankHoliday = bankHolidaysMap.has(key);
    const isClosure = closuresMap.has(key);

    const style: React.CSSProperties = {};
    if (isBankHoliday) {
      style.backgroundColor = "var(--mantine-color-red-1)";
      style.color = "var(--mantine-color-red-9)";
      style.fontWeight = 700;
      style.borderRadius = "8px";
    } else if (isClosure) {
      style.backgroundColor = "var(--mantine-color-gray-2)";
      style.color = "var(--mantine-color-gray-8)";
      style.fontWeight = 700;
      style.borderRadius = "8px";
    } else if (isLeave) {
      style.backgroundColor = "var(--mantine-color-blue-1)";
      style.color = "var(--mantine-color-blue-9)";
      style.fontWeight = 700;
      style.borderRadius = "8px";
    }

    return { style };
  };

  const renderDay: DatePickerProps<"range">["renderDay"] = (date) => {
    const dayObj = dayjs(date);
    const dayNum = dayObj.date();
    const key = dayObj.format("YYYY-MM-DD");
    const isLeave = myApprovedDates.has(key);
    const isBankHoliday = bankHolidaysMap.has(key);
    const isClosure = closuresMap.has(key);
    const isHighlighted = isLeave || isBankHoliday || isClosure;

    return (
      <Stack
        gap={2}
        align="center"
        justify="center"
        style={{ height: "100%", width: "100%", position: "relative" }}
      >
        <Text size="xs" lh={1} fw={isHighlighted ? 700 : 400}>
          {dayNum}
        </Text>
        {(isLeave || isBankHoliday || isClosure) && (
          <Flex
            gap={3}
            align="center"
            justify="center"
            style={{ position: "absolute", bottom: 2, left: 0, right: 0 }}
          >
            {isLeave && (
              <span
                style={{ ...dotStyle, background: "var(--mantine-color-blue-6)" }}
              />
            )}
            {isBankHoliday && (
              <span
                style={{
                  ...dotStyle,
                  background: "var(--mantine-color-red-6)",
                }}
              />
            )}
            {isClosure && (
              <span
                style={{
                  ...dotStyle,
                  background: "var(--mantine-color-gray-6)",
                }}
              />
            )}
          </Flex>
        )}
      </Stack>
    );
  };

  const nonWorkingInRange = useMemo(() => {
    const dates: string[] = [];
    if (!startDate || !endDate) return dates;

    let cur = dayjs(startDate);
    const last = dayjs(endDate);
    while (!cur.isAfter(last, "day")) {
      const key = cur.format("YYYY-MM-DD");
      if (nonWorkingDates.has(key)) dates.push(key);
      cur = cur.add(1, "day");
    }
    return dates;
  }, [startDate, endDate, nonWorkingDates]);

  const nonWorkingError =
    nonWorkingInRange.length > 0
      ? `Selected range includes non-working days (${formatDateList(
          nonWorkingInRange
        )}). Please choose a range without bank holidays or company closures.`
      : null;

  const approvedOverlapInRange = useMemo(() => {
    if (!startDate || !endDate) return [] as string[];
    return findBookedWorkingDaysInRange(
      dayjs(startDate).format("YYYY-MM-DD"),
      dayjs(endDate).format("YYYY-MM-DD"),
      myApprovedDates,
      nonWorkingDates
    );
  }, [startDate, endDate, myApprovedDates, nonWorkingDates]);

  const approvedOverlapError =
    approvedOverlapInRange.length > 0
      ? `Selected range overlaps with your approved leave (${formatDateList(
          approvedOverlapInRange
        )}).`
      : null;

  const daysRequested =
    startDate && endDate ? countWorkingDays(startDate, endDate, nonWorkingDates) : 0;

  const rangeError = nonWorkingError ?? approvedOverlapError;

  const selectedTypeBalance = balance.find((b) => b.type === form.values.type);

  const handleSubmit = async () => {
    setBalanceError(null);

    if (rangeError) {
      form.setFieldError("dateRange", rangeError);
      return;
    }

    const startsInCurrentPeriod =
      !!startDateStr && !!balancePeriod && startDateStr >= balancePeriod.start && startDateStr <= balancePeriod.end;

    if (
      startsInCurrentPeriod &&
      selectedTypeBalance &&
      form.values.type === "holiday" &&
      daysRequested > selectedTypeBalance.remaining
    ) {
      setBalanceError(
        `You don't have enough ${LEAVE_TYPE_META[form.values.type].label} days to submit this request. ` +
        `Requested: ${daysRequested} day${daysRequested !== 1 ? "s" : ""}, ` +
        `remaining: ${selectedTypeBalance.remaining} day${selectedTypeBalance.remaining !== 1 ? "s" : ""}. ` +
        `Pending requests do not reduce your balance until approved, so the approver may still reject this request if the balance runs out.`
      );
      return;
    }

    setLoading(true);

    const result = await createLeaveRequest({
      startDate: dayjs(startDate).format("YYYY-MM-DD"),
      endDate: dayjs(endDate).format("YYYY-MM-DD"),
      type: form.values.type,
      comment: form.values.comment ?? "",
    });

    setLoading(false);

    if (result?.error) {
      form.setFieldError("dateRange", result.error);
    } else {
      router.push("/me/leave-requests");
    }
  };

  return (
    <Container size="sm" py="lg" px={{ base: "xs", sm: "md" }}>
      <Stack gap="lg">
        <Title order={2}>New Leave Request</Title>
        <Paper p={{ base: "md", sm: "xl" }} radius="md" withBorder>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                label="Submitted By"
                description="First and last name of the person submitting the request"
                value={
                  employee ? `${employee.firstName} ${employee.lastName}` : ""
                }
                placeholder="Loading name..."
                readOnly
                disabled={employeeLoading}
              />

              <Popover
                opened={opened}
                onChange={setOpened}
                position="bottom-start"
                offset={4}
                shadow="md"
                radius="md"
                disabled={dataLoading}
              >
                <Popover.Target>
                  <TextInput
                    label="Select Holiday Dates"
                    placeholder="Pick start and end date"
                    leftSection={<IconCalendar size={18} />}
                    value={formattedRange}
                    readOnly
                    disabled={dataLoading}
                    error={form.errors.dateRange}
                    onClick={() => setOpened((o) => !o)}
                    rightSection={
                      startDateStr ? (
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          onClick={(e) => {
                            e.stopPropagation();
                            form.setFieldValue("dateRange", [null, null]);
                          }}
                          aria-label="Clear dates"
                        >
                          <IconX size={16} />
                        </ActionIcon>
                      ) : undefined
                    }
                  />
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack gap="xs">
                    <DatePicker
                      type="range"
                      value={form.values.dateRange}
                      onChange={(val) => {
                        const [from, to] = val;
                        if (from && to) {
                          const fromKey = dayjs(from).format("YYYY-MM-DD");
                          const toKey = dayjs(to).format("YYYY-MM-DD");
                          const blocked = findNonWorkingInRange(fromKey, toKey, nonWorkingDates);
                          const booked = findBookedWorkingDaysInRange(
                            fromKey,
                            toKey,
                            myApprovedDates,
                            nonWorkingDates
                          );
                          if (blocked.length > 0 || booked.length > 0) {
                            form.setFieldValue("dateRange", [null, null]);
                            form.setFieldError(
                              "dateRange",
                              blocked.length > 0
                                ? `Range includes non-working days (${formatDateList(blocked)}). Choose a range without bank holidays or company closures.`
                                : `Range overlaps with your approved leave (${formatDateList(booked)}).`
                            );
                            return;
                          }
                        }
                        form.clearFieldError("dateRange");
                        form.setFieldValue("dateRange", val as [Date | null, Date | null]);
                        if (from && to) {
                          setOpened(false);
                        }
                      }}
                      excludeDate={isUnavailable}
                      getDayProps={getDayCellProps}
                      renderDay={renderDay}
                      allowSingleDateInRange
                    />
                    <Divider />
                    <Group gap="sm" mt="xs" wrap="wrap">
                      <Group gap="xs" align="center">
                        <span
                          style={{
                            ...dotStyle,
                            background: "var(--mantine-color-blue-6)",
                          }}
                        />
                        <Text size="xs" c="dimmed">
                          Booked Leave
                        </Text>
                      </Group>
                      <Group gap="xs" align="center">
                        <span
                          style={{
                            ...dotStyle,
                            background: "var(--mantine-color-red-6)",
                          }}
                        />
                        <Text size="xs" c="dimmed">
                          Bank holiday
                        </Text>
                      </Group>
                      <Group gap="xs" align="center">
                        <span
                          style={{
                            ...dotStyle,
                            background: "var(--mantine-color-gray-6)",
                          }}
                        />
                        <Text size="xs" c="dimmed">
                          Company closure
                        </Text>
                      </Group>
                    </Group>
                  </Stack>
                </Popover.Dropdown>
              </Popover>

              {rangeError && (
                <Alert
                  icon={<IconAlertTriangle size={16} />}
                  color="red"
                  title="Selected range is not allowed"
                  variant="light"
                >
                  {rangeError}
                </Alert>
              )}

              <Select
                label="Leave Type"
                data={LEAVE_REQUEST_TYPES.map((t) => ({
                  value: t,
                  label: LEAVE_TYPE_META[t].label,
                }))}
                allowDeselect={false}
                {...form.getInputProps("type")}
                onChange={(value) => {
                  form.setFieldValue("type", value as LeaveRequestType);
                  setBalanceError(null);
                }}
              />

              {selectedTypeBalance && (
                <Paper p="sm" radius="sm" withBorder bg="var(--mantine-color-gray-0)">
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="sm" fw={500}>
                      {LEAVE_TYPE_META[form.values.type].label} balance:
                    </Text>
                    <Group gap="xs">
                      <Badge color="gray" variant="light">
                        Allowance: {selectedTypeBalance.allowance}d
                      </Badge>
                      <Badge color="red" variant="light">
                        Used: {selectedTypeBalance.used}d
                      </Badge>
                      <Badge
                        color={selectedTypeBalance.remaining > 0 ? "green" : "red"}
                        variant="filled"
                      >
                        Remaining: {selectedTypeBalance.remaining}d
                      </Badge>
                    </Group>
                  </Group>
                </Paper>
              )}

              {daysRequested > 0 && (
                <Paper
                  p="sm"
                  radius="sm"
                  withBorder
                  bg="var(--mantine-color-gray-0)"
                >
                  <Flex justify="space-between" align="center">
                    <Text size="sm" fw={500}>
                      Total Days Requested:
                    </Text>
                    <Text size="sm" fw={700} c="blue">
                      {daysRequested} {daysRequested === 1 ? "day" : "days"}
                    </Text>
                  </Flex>
                </Paper>
              )}

              {form.values.type === "holiday" &&
                myRequests.some((req) => req.status === "pending" && req.type === "holiday") && (
                  <Alert
                    icon={<IconAlertTriangle size={16} />}
                    color="yellow"
                    title="Pending holiday requests"
                    variant="light"
                  >
                    You have pending holiday requests. They do not block the calendar and do not reduce your remaining balance until approved. If they are approved later and exceed your balance, the approval will be rejected.
                  </Alert>
                )}

              {balanceError && (
                <Alert
                  icon={<IconAlertTriangle size={16} />}
                  color="red"
                  title="Insufficient leave balance"
                  variant="light"
                >
                  {balanceError}
                </Alert>
              )}

              <Divider my="xs" />

              <Textarea
                label="Comment"
                placeholder="Add any additional details (optional)"
                autosize
                minRows={2}
                maxRows={4}
                {...form.getInputProps("comment")}
              />

              <Flex
                direction={{ base: "column", xs: "row" }}
                justify="space-between"
                align={{ base: "flex-start", sm: "center" }}
                gap="sm"
              >
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Date Submitted
                  </Text>
                  <Flex gap={6} align="center">
                    <IconCalendar size={16} style={{ opacity: 0.7 }} />
                    <Text size="sm" fw={500}>
                      {dayjs().format("YYYY-MM-DD")}
                    </Text>
                  </Flex>
                </div>
              </Flex>

              <Flex justify="flex-end" mt="md" gap="sm">
                <Button
                  variant="light"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  Submit Request
                </Button>
              </Flex>
            </Stack>
          </form>
        </Paper>
      </Stack>
    </Container>
  );
}

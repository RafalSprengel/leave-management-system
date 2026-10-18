"use client";

import {
  ActionIcon,
  Badge,
  Center,
  Flex,
  Group,
  Loader,
  MultiSelect,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  DateStringValue,
  getStartOfWeek,
  MobileMonthView,
  Schedule,
  ScheduleHeader,
  type ScheduleEventData,
} from "@mantine/schedule";
import {
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconUsers,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTeamLeaveRequests } from "@/hooks/useTeamLeaveRequests";
import { useNonWorkingDays } from "@/hooks/useNonWorkingDays";
import { getWorkingDaySegments } from "@/utils/workingDays";
import { LEAVE_REQUEST_TYPES, getLeaveTypeColor } from "@/constants/leaveTypes";

const typeColors: Record<string, string> = Object.fromEntries(
  LEAVE_REQUEST_TYPES.map((t) => [t, getLeaveTypeColor(t)]),
);

const closureDotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  flexShrink: 0,
  background: "var(--mantine-color-gray-6)",
};

const bankHolidayDotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  flexShrink: 0,
  background: "var(--mantine-color-red-6)",
};

type CalendarView = "week" | "month" | "year";

const formatShortName = (name?: string): string => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return `${firstName[0]}. ${lastName}`;
};

function getNavigationHandlers(date: DateStringValue, view: CalendarView) {
  const d = dayjs(date);
  switch (view) {
    case "week":
      return {
        previous: d.subtract(1, "week"),
        next: d.add(1, "week"),
      };
    case "month":
      return {
        previous: d.subtract(1, "month").startOf("month"),
        next: d.add(1, "month").startOf("month"),
      };
    case "year":
      return {
        previous: d.subtract(1, "year").startOf("year"),
        next: d.add(1, "year").startOf("year"),
      };
  }
}

function getHeaderLabel(date: DateStringValue, view: CalendarView) {
  const d = dayjs(date);
  switch (view) {
    case "week": {
      const start = dayjs(getStartOfWeek({ date, firstDayOfWeek: 1 }));
      const end = start.add(6, "day");
      if (start.month() === end.month()) {
        return `${start.format("MMM D")} – ${end.format("D, YYYY")}`;
      }
      return `${start.format("MMM D")} – ${end.format("MMM D, YYYY")}`;
    }
    case "month":
      return d.format("MMMM YYYY");
    case "year":
      return d.format("YYYY");
  }
}

function CalendarHeader({
  date,
  view,
  onDateChange,
  onViewChange,
}: {
  date: DateStringValue;
  view: CalendarView;
  onDateChange: (date: DateStringValue) => void;
  onViewChange: (view: CalendarView) => void;
}) {
  const nav = getNavigationHandlers(date, view);

  return (
    <Stack gap="xs" mb="sm">
      <ScheduleHeader>
        <ScheduleHeader.Previous
          onClick={() =>
            onDateChange(nav.previous.format("YYYY-MM-DD") as DateStringValue)
          }
        />
        <ScheduleHeader.Control interactive={false}>
          {getHeaderLabel(date, view)}
        </ScheduleHeader.Control>
        <ScheduleHeader.Next
          onClick={() =>
            onDateChange(nav.next.format("YYYY-MM-DD") as DateStringValue)
          }
        />
        <ScheduleHeader.Today
          onClick={() =>
            onDateChange(dayjs().format("YYYY-MM-DD") as DateStringValue)
          }
        />
      </ScheduleHeader>

      <SegmentedControl
        value={view}
        onChange={(val) => onViewChange(val as CalendarView)}
        data={[
          { label: "Week", value: "week" },
          { label: "Month", value: "month" },
          { label: "Year", value: "year" },
        ]}
        fullWidth
      />
    </Stack>
  );
}

export default function TeamCalendarPage() {
  const router = useRouter();
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(
    "All",
  );
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [mobileView, setMobileView] = useState<"calendar" | "list">("calendar");
  const [mobileDate, setMobileDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [mobileSelectedDate, setMobileSelectedDate] = useState<string | null>(
    dayjs().format("YYYY-MM-DD"),
  );

  const [scheduleView, setScheduleView] = useState<CalendarView>("month");
  const [scheduleDate, setScheduleDate] = useState<DateStringValue>(
    dayjs().format("YYYY-MM-DD") as DateStringValue,
  );

  const { requests, loading } = useTeamLeaveRequests();
  const { bankHolidaysMap, closuresMap, loading: loadingClosures } =
    useNonWorkingDays();

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

  const departmentsList = useMemo(() => {
    const depts = new Set<string>();
    requests.forEach((req) => {
      if (req.departmentName) {
        depts.add(req.departmentName);
      }
    });
    return ["All", ...Array.from(depts)];
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (req.status !== "approved") return false;

      if (
        selectedDepartment &&
        selectedDepartment !== "All" &&
        req.departmentName !== selectedDepartment
      ) {
        return false;
      }

      if (selectedTypes.length > 0 && !selectedTypes.includes(req.type)) {
        return false;
      }

      return true;
    });
  }, [requests, selectedDepartment, selectedTypes]);

  const holidayEvents: ScheduleEventData[] = useMemo(() => {
    return Array.from(bankHolidaysMap, ([date, title]) => ({
      id: `holiday-${date}`,
      title,
      start: `${date} 00:00:00`,
      end: `${date} 23:59:59`,
      color: "red",
    }));
  }, [bankHolidaysMap]);

  const closureEvents: ScheduleEventData[] = useMemo(() => {
    return Array.from(closuresMap, ([date, title]) => ({
      id: `closure-${date}`,
      title,
      start: `${date} 00:00:00`,
      end: `${date} 23:59:59`,
      color: "gray",
    }));
  }, [closuresMap]);

  const scheduleEvents: ScheduleEventData[] = useMemo(() => {
    const today = dayjs().startOf("day");

    const sortedRequests = [...filteredRequests].sort((a, b) =>
      formatShortName(a.employeeName).localeCompare(
        formatShortName(b.employeeName),
        undefined,
        { sensitivity: "base" },
      ),
    );

    const leaveEvents: ScheduleEventData[] = sortedRequests.flatMap((req) => {
      const shortName = formatShortName(req.employeeName);
      const name = shortName || "No name";
      const days = req.daysRequested;
      const absenceNote = req.absenceDays
        ? `, ${req.absenceDays} covered by absence`
        : "";
      const title = days
        ? `${name} (${days} ${days === 1 ? "day" : "days"}${absenceNote})`
        : name;

      const isPast = dayjs(req.endDate).endOf("day").isBefore(today);
      const color = isPast ? "gray.2" : typeColors[req.type] || "gray";

      return getWorkingDaySegments(
        req.startDate,
        req.endDate,
        nonWorkingDates,
      ).map((segment, index) => ({
        id: `${req._id}#${index}`,
        title,
        start: `${segment.start} 00:00:00`,
        end: `${segment.end} 23:59:59`,
        color,
      }));
    });

    return [...holidayEvents, ...closureEvents, ...leaveEvents];
  }, [filteredRequests, holidayEvents, closureEvents, nonWorkingDates]);
  const maxEventsPerDay = useMemo(() => {
    const gridStart = dayjs(scheduleDate).startOf("month").startOf("isoWeek");
    const cap = 6;
    let busiest = 0;

    for (let offset = 0; offset < 42; offset += 1) {
      const day = gridStart.add(offset, "day");
      let count = 0;

      for (const ev of scheduleEvents) {
        const start = dayjs(ev.start).startOf("day");
        const end = dayjs(ev.end).startOf("day");
        if (!day.isBefore(start, "day") && !day.isAfter(end, "day")) {
          count += 1;
        }
      }

      if (count > busiest) busiest = count;
    }

    return Math.min(cap, Math.max(1, busiest));
  }, [scheduleEvents, scheduleDate]);

  const handleEventClick = (event: ScheduleEventData) => {
    const rawId = String(event.id);
    if (rawId.startsWith("closure-")) return;
    if (rawId.startsWith("holiday-")) return;
    const leaveRequestId = rawId.split("#")[0];
    router.push(`/team/leave-requests/${leaveRequestId}`);
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Team Calendar</Title>
          <Text size="sm" c="dimmed">
            Overview of team absences, holidays, and pending leave requests
          </Text>
        </div>
      </Group>

      <Paper p="md" radius="md" withBorder bg="var(--mantine-color-body)">
        <Flex gap="md" wrap="nowrap" align="flex-end">
          <Select
            label="Department"
            placeholder="Filter by department"
            leftSection={<IconFilter size={16} />}
            data={departmentsList}
            value={selectedDepartment}
            onChange={setSelectedDepartment}
            flex={{ base: "1 1 0", md: "0 1 220px" }}
            miw={0}
          />
          <MultiSelect
            label="Leave Types"
            placeholder="All types"
            data={[
              { value: "annual", label: "Annual Leave" },
              { value: "sick", label: "Sick Leave" },
              { value: "unpaid", label: "Unpaid Leave" },
              { value: "other", label: "Other" },
            ]}
            value={selectedTypes}
            onChange={setSelectedTypes}
            flex={1}
            miw={0}
          />
        </Flex>
      </Paper>

      {loading || loadingClosures ? (
        <Center py="xl">
          <Loader size="md" />
        </Center>
      ) : (
        <>
          <Paper
            p="xs"
            radius="md"
            withBorder
            bg="var(--mantine-color-body)"
            hiddenFrom="md"
          >
            <SegmentedControl
              value={mobileView}
              onChange={(val) => setMobileView(val as "calendar" | "list")}
              data={[
                { value: "calendar", label: "Calendar" },
                { value: "list", label: "List" },
              ]}
              fullWidth
            />
          </Paper>

          <Paper
            p="md"
            radius="md"
            withBorder
            bg="var(--mantine-color-body)"
            hiddenFrom="md"
            display={mobileView === "calendar" ? "block" : "none"}
          >
            <CalendarHeader
              date={scheduleDate}
              view={scheduleView}
              onDateChange={setScheduleDate}
              onViewChange={setScheduleView}
            />
            <Schedule
              events={scheduleEvents}
              view={scheduleView}
              onViewChange={(v) => setScheduleView(v as CalendarView)}
              date={scheduleDate}
              onDateChange={(d) => setScheduleDate(d as DateStringValue)}
              onEventClick={handleEventClick}
              monthViewProps={{
                firstDayOfWeek: 1,
                withHeader: false,
                maxEventsPerDay,
              }}
              weekViewProps={{
                firstDayOfWeek: 1,
                startTime: "08:00:00",
                endTime: "18:00:00",
                withHeader: false,
              }}
              yearViewProps={
                { withHeader: false, onEventClick: undefined } as never
              }
            />
          </Paper>

          <Paper
            p="md"
            radius="md"
            withBorder
            bg="var(--mantine-color-body)"
            hiddenFrom="md"
            display={mobileView === "list" ? "block" : "none"}
          >
            <Flex justify="space-between" align="center" mb="sm">
              <ActionIcon
                variant="subtle"
                onClick={() =>
                  setMobileDate(
                    dayjs(mobileDate).subtract(1, "month").format("YYYY-MM-DD"),
                  )
                }
              >
                <IconChevronLeft size={20} />
              </ActionIcon>
              <Text fw={600} size="md">
                {dayjs(mobileDate).format("MMMM YYYY")}
              </Text>
              <ActionIcon
                variant="subtle"
                onClick={() =>
                  setMobileDate(
                    dayjs(mobileDate).add(1, "month").format("YYYY-MM-DD"),
                  )
                }
              >
                <IconChevronRight size={20} />
              </ActionIcon>
            </Flex>
            <MobileMonthView
              date={mobileDate}
              onDateChange={setMobileDate}
              selectedDate={mobileSelectedDate}
              onSelectedDateChange={setMobileSelectedDate}
              events={scheduleEvents}
              firstDayOfWeek={1}
            />
          </Paper>

          <Paper
            p="md"
            radius="md"
            withBorder
            bg="var(--mantine-color-body)"
            visibleFrom="md"
          >
            <CalendarHeader
              date={scheduleDate}
              view={scheduleView}
              onDateChange={setScheduleDate}
              onViewChange={setScheduleView}
            />
            <Schedule
              events={scheduleEvents}
              view={scheduleView}
              onViewChange={(v) => setScheduleView(v as CalendarView)}
              date={scheduleDate}
              onDateChange={(d) => setScheduleDate(d as DateStringValue)}
              onEventClick={handleEventClick}
              monthViewProps={{
                firstDayOfWeek: 1,
                withHeader: false,
                maxEventsPerDay,
              }}
              weekViewProps={{
                firstDayOfWeek: 1,
                startTime: "08:00:00",
                endTime: "18:00:00",
                withHeader: false,
              }}
              yearViewProps={
                { withHeader: false, onEventClick: undefined } as never
              }
            />
          </Paper>

          <Paper p="sm" radius="md" withBorder>
            <Group gap="xs" align="center">
              <span style={bankHolidayDotStyle} />
              <Text size="sm">Bank holidays</Text>
            </Group>
          </Paper>

          <Paper p="sm" radius="md" withBorder>
            <Group gap="xs" align="center">
              <span style={closureDotStyle} />
              <Text size="sm">Closure days</Text>
            </Group>
          </Paper>
        </>
      )}
    </Stack>
  );
}
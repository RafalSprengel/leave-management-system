"use client";

import { Flex, Loader, Paper, Stack, Text, Title } from "@mantine/core";
import {
  DateStringValue,
  ResourcesMonthView,
  type ScheduleEventData,
  type ScheduleResourceData,
} from "@mantine/schedule";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import {
  getTeamApprovedLeaveRequestsInRange,
  type TeamApprovedLeaveItem,
} from "@/actions/manager/leave/getTeamApprovedLeaveRequestsInRange";
import { useNonWorkingDays } from "@/hooks/useNonWorkingDays";
import { getLeaveTypeColor, getLeaveTypeLabel } from "@/constants/leaveTypes";
import { getWorkingDaySegments } from "@/utils/workingDays";

const THIS_REQUEST_ID = "__this_request__";
const REQUEST_COLOR = "red";
const CONTEXT_DAYS = 1;

interface LeaveResourcesMonthViewProps {
  request: {
    _id: string;
    employee?: string;
    employeeName?: string;
    startDate: string;
    endDate: string;
    startHalfDay: boolean;
    endHalfDay: boolean;
    type: string;
  };
}

export function LeaveResourcesMonthView({ request }: LeaveResourcesMonthViewProps) {
  const [items, setItems] = useState<TeamApprovedLeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { bankHolidaysMap, closuresMap, loading: loadingNonWorking } = useNonWorkingDays();

  const monthStart = dayjs(request.startDate).startOf("month").format("YYYY-MM-DD");
  const monthEnd = dayjs(request.startDate).endOf("month").format("YYYY-MM-DD");
  const windowStart = dayjs(request.startDate).subtract(CONTEXT_DAYS, "day").format("YYYY-MM-DD");
  const windowEnd = dayjs(request.endDate).add(CONTEXT_DAYS, "day").format("YYYY-MM-DD");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTeamApprovedLeaveRequestsInRange(monthStart, monthEnd).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setItems(res.data);
        setError(null);
      } else {
        setItems([]);
        setError(res.error);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [monthStart, monthEnd]);

  const nonWorkingDates = useMemo(() => {
    const set = new Set<string>();
    bankHolidaysMap.forEach((_, day) => set.add(day));
    closuresMap.forEach((_, day) => set.add(day));
    return set;
  }, [bankHolidaysMap, closuresMap]);

  const { resources, events } = useMemo(() => {
    const resourceMap = new Map<string, ScheduleResourceData>();
    const eventList: ScheduleEventData[] = [];

    const addEvent = (
      item: { _id: string; type: string; startDate: string; endDate: string; startHalfDay: boolean; endHalfDay: boolean },
      resourceId: string,
      color: string,
    ) => {
      const segments = getWorkingDaySegments(item.startDate, item.endDate, nonWorkingDates);
      for (const segment of segments) {
        const startsHalf = segment.start === item.startDate && item.startHalfDay;
        const endsHalf = segment.end === item.endDate && item.endHalfDay;
        eventList.push({
          id: `${item._id}-${segment.start}`,
          title: getLeaveTypeLabel(item.type),
          start: `${segment.start} ${startsHalf ? "12:00:00" : "00:00:00"}`,
          end: `${segment.end} ${endsHalf ? "12:00:00" : "23:59:59"}`,
          color,
          resourceId,
        });
      }
    };

    resourceMap.set(THIS_REQUEST_ID, { id: THIS_REQUEST_ID, label: "THIS REQUEST" });
    addEvent(request, THIS_REQUEST_ID, REQUEST_COLOR);

    const nearbyEmployees = new Map<string, TeamApprovedLeaveItem[]>();
    for (const item of items) {
      if (!item.employee || item.employee === request.employee) continue;
      const overlapsWindow = item.startDate <= windowEnd && item.endDate >= windowStart;
      if (!overlapsWindow) continue;
      const list = nearbyEmployees.get(item.employee) ?? [];
      list.push(item);
      nearbyEmployees.set(item.employee, list);
    }

    const sortedEmployees = Array.from(nearbyEmployees.entries()).sort(([, a], [, b]) =>
      String(a[0].employeeName).localeCompare(String(b[0].employeeName)),
    );

    for (const [employeeId, employeeItems] of sortedEmployees) {
      resourceMap.set(employeeId, {
        id: employeeId,
        label: employeeItems[0].employeeName || "Unknown employee",
      });
      for (const item of employeeItems) {
        addEvent(item, employeeId, getLeaveTypeColor(item.type));
      }
    }

    return {
      resources: Array.from(resourceMap.values()),
      events: eventList,
    };
  }, [items, nonWorkingDates, request, windowStart, windowEnd]);

  const isLoading = loading || loadingNonWorking;

  return (
    <Paper p={{ base: "md", sm: "xl" }} radius="md" withBorder>
      <Stack gap="md">
        <Title order={4}>Team leave</Title>

        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}

        {isLoading ? (
          <Flex justify="center" py="md">
            <Loader />
          </Flex>
        ) : (
          <ResourcesMonthView
            date={monthStart as DateStringValue}
            resources={resources}
            events={events}
            withHeader={false}
            mode="static"
            highlightToday
            startScrollDate={request.startDate}
          />
        )}
      </Stack>
    </Paper>
  );
}

"use client";

import { Group, Paper, SegmentedControl, Stack, Text } from "@mantine/core";
import {
  DateStringValue,
  Schedule,
  ScheduleHeader,
  type ScheduleEventData,
} from "@mantine/schedule";
import dayjs from "dayjs";
import { useState } from "react";

const dotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  flexShrink: 0,
  background: "var(--mantine-color-blue-6)",
};

export interface EmployeeScheduleEvent {
  id: string;
  title: string;
  start: string;
  end: string;
}

interface HolidayScheduleProps {
  events: EmployeeScheduleEvent[];
  closures?: EmployeeScheduleEvent[];
}

// Dostepne widoki: tylko rok i miesiac (bez week i day)
type CalendarView = "month" | "year";

function getNavigationHandlers(date: DateStringValue, view: CalendarView) {
  const d = dayjs(date);
  switch (view) {
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
  return view === "month" ? d.format("MMMM YYYY") : d.format("YYYY");
}

// Własny nagłówek harmonogramu: nawigacja + SegmentedControl zamiast Select
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
        <div style={{ marginInlineStart: "auto" }}>
          <ScheduleHeader.Today
            onClick={() =>
              onDateChange(dayjs().format("YYYY-MM-DD") as DateStringValue)
            }
          />
        </div>
      </ScheduleHeader>

      <SegmentedControl
        value={view}
        onChange={(val) => onViewChange(val as CalendarView)}
        data={[
          { label: "Month", value: "month" },
          { label: "Year", value: "year" },
        ]}
        fullWidth
      />
    </Stack>
  );
}

export default function HolidaySchedule({
  events,
  closures = [],
}: HolidayScheduleProps) {
  const [view, setView] = useState<CalendarView>("year");
  const [date, setDate] = useState<DateStringValue>(
    dayjs().format("YYYY-MM-DD") as DateStringValue,
  );

  const today = dayjs().startOf("day");

  const scheduleEvents: ScheduleEventData[] = [
    ...events.map((event) => {
      const isPast = dayjs(event.end).endOf("day").isBefore(today);
      return { ...event, color: isPast ? "gray.2" : "blue" };
    }),
    ...closures.map((event) => ({ ...event, color: "gray" })),
  ];

  return (
    <Stack gap="lg" w="100%">
      <div>
        <CalendarHeader
          date={date}
          view={view}
          onDateChange={setDate}
          onViewChange={setView}
        />
        <Schedule
          events={scheduleEvents}
          view={view}
          onViewChange={(v) => setView(v as CalendarView)}
          date={date}
          onDateChange={(d) => setDate(d as DateStringValue)}
          monthViewProps={{
            firstDayOfWeek: 1,
            withHeader: false,
          }}
          yearViewProps={{
            withOutsideDays: false,
            withHeader: false,
          }}
        />
      </div>

      <Paper withBorder radius="md" p="sm">
        <Group gap="xs" align="center">
          <span style={dotStyle} />
          <Text size="sm">Holiday</Text>
        </Group>
      </Paper>

      {closures.length > 0 && (
        <Paper withBorder radius="md" p="sm">
          <Group gap="xs" align="center">
            <span
              style={{
                ...dotStyle,
                background: "var(--mantine-color-gray-6)",
              }}
            />
            <Text size="sm">Closure days</Text>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}